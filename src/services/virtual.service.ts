import { Injectable } from '@nestjs/common';
import { XpressErrorHandler } from 'src/common/XpressErrorHandler';
import { IdentityService } from 'src/identity/identity.service';
import { XpressRequest, XpressResponse } from 'src/proto/gaming.pb';
import { MD5 } from 'crypto-js';
import { InjectRepository } from '@nestjs/typeorm';
import { GameKey } from 'src/entities/game-key.entity';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { WalletService } from 'src/wallet/wallet.service';
import { BetService } from 'src/bet/bet.service';

const errorHandler = new XpressErrorHandler();

@Injectable()
export class VirtualService {
  constructor(
    @InjectRepository(GameKey)
    private gameKeyRepository: Repository<GameKey>,
    private identityService: IdentityService,
    private walletService: WalletService,
    private bettingService: BetService,
  ) {}

  async doXpressLogin(params: XpressRequest): Promise<XpressResponse> {
    try {
      const { token, requestId, clientId } = params;
      const res = await this.identityService.xpressLogin({ clientId, token });

      if (!res.status) {
        return errorHandler.invalidSecureToken();
      } else {
        const user = res.data;
        // find the operator settings
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
            client_id: clientId,
            option: 'PRIVATE_KEY',
            provider: 'xpress',
          },
        });

        if (!privateKeyQuery) errorHandler.invalidSecureToken();

        const data = {
          playerId: user.playerId,
          currency: user.currency,
          balance: user.balance.toFixed(2),
          sessionId: user.sessionId,
          group: user.group,
          timestamp: dayjs().toISOString(),
          requestId,
          fingerprint: '',
        };

        console.log(data)


        const hashStr = `${data.playerId}${data.currency}${data.balance}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

        data.fingerprint = MD5(hashStr).toString();

        return {
          status: true,
          code: 200,
          message: 'Success',
          data,
        };
      }
    } catch (e) {
      console.log('error', e);
      return errorHandler.internalError();
    }
  }

  async getBalance(params: XpressRequest): Promise<XpressResponse> {
    try {
      const { group, playerId, sessionId, clientId, requestId, currency } =
        params;
      const isValid = await this.identityService.validateXpressSession({
        sessionId,
        clientId,
      });
      // console.log(isValid)
      if (isValid.success) {
        const user: any = isValid.data;

        // find the operator settings
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
            client_id: clientId,
            option: 'PRIVATE_KEY',
            provider: 'xpress',
          },
        });

        const walletRes = await this.walletService.getWallet({
          userId: user.id,
          clientId,
        });

        const data = {
          playerId, // operator identifier+playerID
          currency,
          balance: walletRes.data.availableBalance.toFixed(2),
          sessionId,
          group,
          timestamp: dayjs().toISOString(),
          requestId,
          fingerprint: '',
        };
        const hashStr = `${data.playerId}${data.currency}${data.balance}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

        data.fingerprint = MD5(hashStr).toString();

        return {
          status: true,
          code: 200,
          message: 'Success',
          data,
        };
      } else {
        return errorHandler.incorrectIdentifier();
      }
    } catch (e) {
      console.log('error', e);
      return errorHandler.internalError();
    }
  }

  async doDebit(params: XpressRequest): Promise<XpressResponse> {
    try {
      const {
        clientId,
        group,
        playerId,
        sessionId,
        requestId,
        gameId,
        gameCycle,
        transactionId,
        transactionAmount,
        transactionCategory,
      } = params;

      // validate session
      const isValid = await this.identityService.validateXpressSession({
        sessionId,
        clientId,
      });
      // console.log(isValid)
      if (isValid.success) {
        const user: any = isValid.data;
        // console.log(user);
        if (user.status !== 1) return errorHandler.incorrectIdentifier();

        if (!user.virtualToken) return errorHandler.incorrectIdentifier();

        if (user.virtualToken !== sessionId)
          return errorHandler.incorrectIdentifier();

        const virtualBetRes = await this.bettingService.validateVirtualBet({
          clientId,
          gameId: gameCycle,
          transactionId,
        });

        if (virtualBetRes.success && virtualBetRes.gameId)
          return errorHandler.gameCycleExist();

        if (virtualBetRes.success && virtualBetRes.transactionId)
          return errorHandler.transactionExist();

        if (virtualBetRes.success && virtualBetRes.data.gameCycleClosed === 1)
          return errorHandler.gameCycleClosed();

        const walletRes = await this.walletService.getWallet({
          userId: user.id,
          clientId,
        });

        if (walletRes.data.availableBalance < transactionAmount)
          return errorHandler.insufficientFunds();

        const betRes = await this.bettingService.placeVirtualBet({
          clientId,
          userId: user.id,
          username: user.username,
          stake: transactionAmount,
          gameId,
          roundId: gameCycle,
          transactionCategory,
          transactionId,
        });

        if (!betRes.success)
          return errorHandler.requestProcessingServiceUnavailable();

        const debitRes = await this.walletService.debit({
          clientId,
          userId: user.id,
          amount: transactionAmount.toFixed(2),
          source: 'goldenrace',
          description: `${betRes.data.betId} - ${gameCycle}`,
          username: user.username,
          wallet: 'main',
          subject: 'Bet Deposit (Virtual)',
          channel: 'goldenrace',
        });

        const oldBalance = debitRes.data.balance + transactionAmount;

        const data = {
          playerId,
          currency: params.currency,
          balance: debitRes.data.balance.toFixed(2),
          oldBalance: oldBalance.toFixed(2),
          transactionId,
          sessionId,
          group,
          timestamp: dayjs().toISOString(),
          requestId,
          fingerprint: '',
        };

        // find the operator settings
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
            client_id: clientId,
            option: 'PRIVATE_KEY',
            provider: 'xpress',
          },
        });

        const hashStr = `${data.playerId}${data.currency}${data.balance}${data.oldBalance}${data.transactionId}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

        data.fingerprint = MD5(hashStr).toString();

        return {
          status: true,
          code: 200,
          message: 'Success',
          data,
        };
      } else {
        return errorHandler.incorrectIdentifier();
      }
    } catch (error) {
      console.log('internal  error', error.message);
      return errorHandler.internalError();
    }
  }

  async doCredit(params: XpressRequest): Promise<XpressResponse> {
    try {
      const {
        group,
        playerId,
        sessionId,
        requestId,
        gameId,
        gameCycle,
        transactionId,
        transactionAmount,
        transactionCategory,
        gameCycleClosed,
        clientId,
      } = params;
      // get virtual bet
      const virtualBetRes = await this.bettingService.validateVirtualBet({
        clientId,
        gameId: gameCycle,
        transactionId,
      });

      if (!virtualBetRes.success) return errorHandler.gameCycleNotExist();

      if (virtualBetRes.success && virtualBetRes.data.gameCycleClosed === 1)
        return errorHandler.gameCycleClosed();

      const bet = virtualBetRes.data;

      const betRes = await this.bettingService.settleVirtualBet({
        userId: bet.userId,
        clientId,
        amount: transactionAmount,
        jackpot: transactionCategory === 'jackpotwin' ? transactionAmount : 0,
        roundId: gameCycle,
        category: transactionCategory,
        gameCycleClosed: gameCycleClosed ? 1 : 0,
      });

      let balance, oldBalance;

      if (transactionAmount > 0) {
        const creditRes = await this.walletService.credit({
          clientId,
          userId: bet.userId,
          amount: transactionAmount.toFixed(2),
          source: 'system',
          description: `${gameCycle} - ${transactionCategory}`,
          username: bet.username,
          wallet: 'main',
          subject: 'Virtual Sport Win',
          channel: 'goldenrace',
        });

        oldBalance = creditRes.data.balance - transactionAmount;
        balance = creditRes.data.balance;
      } else {
        const walletRes = await this.walletService.getWallet({
          userId: bet.userId,
          clientId,
        });
        balance = walletRes.data.availableBalance;
        oldBalance = walletRes.data.availableBalance - transactionAmount;
      }

      const data = {
        playerId,
        currency: params.currency,
        balance: balance.toFixed(2),
        oldBalance: oldBalance.toFixed(2),
        transactionId,
        sessionId,
        group,
        timestamp: dayjs().toISOString(),
        requestId,
        fingerprint: '',
      };

      // find the operator settings
      const privateKeyQuery = await this.gameKeyRepository.findOne({
        where: {
          client_id: clientId,
          option: 'PRIVATE_KEY',
          provider: 'xpress',
        },
      });

      const hashStr = `${data.playerId}${data.currency}${data.balance}${data.oldBalance}${data.transactionId}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

      data.fingerprint = MD5(hashStr).toString();

      return {
        status: true,
        code: 200,
        message: 'Success',
        data,
      };
    } catch (e) {
      return errorHandler.internalError();
    }
  }

  async doRollback(params: XpressRequest): Promise<XpressResponse> {

    try {
      const {
        group,
        playerId,
        requestId,
        gameId,
        gameCycle,
        sessionId,
        transactionId,
        transactionAmount,
        transactionCategory,
        clientId,
      } = params;

      // get virtual bet
      const virtualBetRes = await this.bettingService.validateVirtualBet({
        clientId,
        gameId: gameCycle,
        transactionId,
      });
      // console.log(virtualBetRes)

      if (!virtualBetRes.success) return errorHandler.gameCycleNotExist();

      if (virtualBetRes.success && !virtualBetRes.gameId)
        return errorHandler.gameCycleNotExist();

      if (virtualBetRes.success && !virtualBetRes.transactionId)
        return errorHandler.transactionNotExist();

      if (virtualBetRes.success && virtualBetRes.data.gameCycleClosed === 1)
        return errorHandler.gameCycleClosed();

      const bet = virtualBetRes.data;

      const betRes = await this.bettingService.settleVirtualBet({
        userId: bet.userId,
        clientId,
        amount: 0,
        jackpot: 0,
        roundId: gameCycle,
        category: transactionCategory,
        gameCycleClosed: 1,
      });

      const creditRes = await this.walletService.credit({
        clientId,
        userId: bet.userId,
        amount: transactionAmount.toFixed(2),
        source: 'system',
        description: `${transactionCategory} - ${gameCycle}`,
        username: bet.username,
        wallet: 'sport',
        subject: 'Virtual Sport Rollback',
        channel: 'goldenrace',
      });

      const oldBalance = creditRes.data.balance - transactionAmount;

      const data = {
        playerId,
        currency: params.currency,
        balance: creditRes.data.balance.toFixed(2),
        oldBalance: oldBalance.toFixed(2),
        transactionId,
        sessionId,
        group,
        timestamp: dayjs().toISOString(),
        requestId,
        fingerprint: '',
      };

      // find the operator settings
      const privateKeyQuery = await this.gameKeyRepository.findOne({
        where: {
          client_id: clientId,
          option: 'PRIVATE_KEY',
          provider: 'xpress',
        },
      });

      const hashStr = `${data.playerId}${data.currency}${data.balance}${data.oldBalance}${data.transactionId}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

      data.fingerprint = MD5(hashStr).toString();

      return {
        status: true,
        code: 200,
        message: 'Success',
        data,
      };
    } catch (e) {
      return errorHandler.internalError();
    }
  }

  async doLogout(params: XpressRequest): Promise<XpressResponse> {
    try {
      const { group, playerId, sessionId, requestId, clientId } = params;

      // validate session
      const isValid = await this.identityService.validateXpressSession({
        sessionId,
        clientId,
      });
      // console.log(isValid)
      if (isValid.success) {
        const { id }: any = isValid.data;

        // call identity service logout user
        const res = await this.identityService.xpressLogout({
          sessionId: id.toString(),
          clientId,
        });

        const user = res.data;

        const data = {
          playerId,
          currency: params.currency,
          balance: user.balance.toFixed(2),
          sessionId,
          group,
          timestamp: dayjs().toISOString(),
          requestId,
          fingerprint: '',
        };
        // find the operator settings
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
            client_id: clientId,
            option: 'PRIVATE_KEY',
            provider: 'xpress',
          },
        });

        const hashStr = `${data.playerId}${data.currency}${data.sessionId}${data.group}${data.timestamp}${data.requestId}${privateKeyQuery.value}`;

        data.fingerprint = MD5(hashStr).toString();

        return {
          status: true,
          code: 200,
          message: 'Success',
          data,
        };
      } else {
        return errorHandler.incorrectIdentifier();
      }
    } catch (e) {
      console.log('logout error', e);
      return errorHandler.internalError();
    }
  }
}
