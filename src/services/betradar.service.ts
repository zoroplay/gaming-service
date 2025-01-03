// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { IdentityService } from 'src/identity/identity.service';
// import { WalletService } from 'src/wallet/wallet.service';

// @Injectable()
// export class BetRadarService {
//   constructor(
//     private readonly configService: ConfigService,
//     private readonly identityService: IdentityService,
//     private readonly walletService: WalletService,
//   ) {}

//   generateLaunchUrl(
//     clientId: string,
//     lang: string,
//     product: string,
//     sessionToken: string,
//     currency?: string,
//     oddsFormat?: string,
//   ): string {
//     const baseUrl =
//       'https://vgcommonstaging.aitcloud.de/srvg-launcher/stable/bwg.html';

//     // Construct the query string
//     const queryParams = new URLSearchParams();
//     queryParams.set('clientId', clientId);
//     queryParams.set('lang', lang);
//     queryParams.set('product', product);
//     queryParams.set('id', sessionToken);

//     if (currency) {
//       queryParams.set('currency', currency);
//     }

//     if (oddsFormat) {
//       queryParams.set('tokens', oddsFormat);
//     }

//     return `${baseUrl}?${queryParams.toString()}`;
//   }

//   generateThirdPartyGameUrl(
//     clientId: string,
//     lang: string,
//     product: string,
//     sessionToken: string,
//     compositionId: string,
//     lobbyUrl?: string,
//     funMode?: string,
//     jurisdiction?: string,
//     brand?: string,
//   ): string {
//     const baseUrl =
//       'https://vgcommonstaging.aitcloud.de/srvg-launcher/stable/bwg.html';

//     // Construct the query string
//     const queryParams = new URLSearchParams();
//     queryParams.set('clientId', clientId);
//     queryParams.set('lang', lang);
//     queryParams.set('product', product === 'index' ? 'index' : 'default'); // Ensure 'product' is set to 'index' for 3rd Party games
//     queryParams.set('id', sessionToken);
//     queryParams.set('compositionId', compositionId); // Set the required compositionId

//     if (lobbyUrl) {
//       queryParams.set('lobbyUrl', lobbyUrl);
//     }

//     if (funMode) {
//       queryParams.set('funMode', funMode);
//     }

//     if (jurisdiction) {
//       queryParams.set('jurisdiction', jurisdiction);
//     }

//     if (brand) {
//       queryParams.set('brand', brand);
//     }

//     return `${baseUrl}?${queryParams.toString()}`;
//   }

//   async getUserInfo(token: string, clientId: number): Promise<any> {
//     if (!token) {
//       throw new HttpException(
//         { status: 'INVALID_TOKEN', message: 'Token is invalid or missing' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     // Validate the token using your IdentityService
//     const res = await this.identityService.xpressLogin({
//       clientId,
//       token,
//     });
//     if (!res.status) {
//       throw new HttpException(
//         { status: 'USER_NOT_FOUND', message: 'Player not found' },
//         HttpStatus.NOT_FOUND,
//       );
//     }

//     // Construct the response
//     return {
//       balance: res.data.balance,
//       correlationNumber,
//       currencyCode: res.data.currency,
//       userId: res.data.playerId,
//       languageCode: 'en',
//       status: 'OK',
//     };
//   }

//   async getBalance(userId: string): Promise<any> {
//     if (!userId) {
//       throw new HttpException(
//         { status: 'USER_NOT_FOUND', message: 'User ID is missing or invalid' },
//         HttpStatus.NOT_FOUND,
//       );
//     }

//     const walletResponse = await this.walletService.getWallet(clientId: userId );
//     if (!walletResponse.success) {
//       throw new HttpException(
//         { status: 'ERROR', message: 'Failed to retrieve user balance' },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     return {
//       balance: walletResponse.data.balance,
//       correlationNumber: Date.now(),
//       currencyCode: walletResponse.data.,
//       status: 'OK',
//     };
//   }

//   async reserveFunds(payload: any): Promise<any> {
//     const { userId, amount, correlationNumber } = payload;
//     if (!userId || !amount) {
//       throw new HttpException(
//         { status: 'REQUEST_FORMAT', message: 'Missing required fields' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     const debitResponse = await this.walletService.debit({
//       userId,
//       amount,
//       description: 'Bet Reserve',
//     });

//     if (!debitResponse.success) {
//       throw new HttpException(
//         { status: 'INSUFFICIENT_FUNDS', message: debitResponse.message },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     return {
//       balance: debitResponse.data.balance,
//       correlationNumber,
//       status: 'OK',
//     };
//   }

//   async processPayment(payload: any): Promise<any> {
//     const { userId, amount, correlationNumber } = payload;
//     if (!userId || !amount) {
//       throw new HttpException(
//         { status: 'REQUEST_FORMAT', message: 'Missing required fields' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     const creditResponse = await this.walletService.credit({
//       userId,
//       amount,
//       description: 'Bet Winnings',
//     });

//     if (!creditResponse.success) {
//       throw new HttpException(
//         { status: 'ERROR', message: 'Failed to credit user account' },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     return {
//       balance: creditResponse.data.balance,
//       correlationNumber,
//       status: 'OK',
//     };
//   }

//   async approveTransaction(paymentId: string): Promise<any> {
//     if (!paymentId) {
//       throw new HttpException(
//         { status: 'PAYMENT_ID_NOT_FOUND', message: 'Payment ID is missing' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     // Assuming approve functionality is handled within WalletService
//     const approvalResponse = await this.walletService.approveTransaction({ paymentId });

//     if (!approvalResponse.success) {
//       throw new HttpException(
//         { status: 'ERROR', message: 'Failed to approve transaction' },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     return {
//       correlationNumber: Date.now(),
//       status: 'OK',
//     };
//   }

//   async cancelTransaction(payload: any): Promise<any> {
//     const { paymentId, correlationNumber } = payload;
//     if (!paymentId) {
//       throw new HttpException(
//         { status: 'PAYMENT_ID_NOT_FOUND', message: 'Payment ID is missing' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     const cancelResponse = await this.walletService.cancelTransaction({ paymentId });

//     if (!cancelResponse.success) {
//       throw new HttpException(
//         { status: 'ERROR', message: 'Failed to cancel transaction' },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     return {
//       balance: cancelResponse.data.balance,
//       correlationNumber,
//       status: 'OK',
//     };
//   }

//   async manualResettle(payload: any): Promise<any> {
//     const { paymentId, amount, correlationNumber } = payload;
//     if (!paymentId || !amount) {
//       throw new HttpException(
//         { status: 'REQUEST_FORMAT', message: 'Missing required fields' },
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     const resettleResponse = await this.walletService.manualResettle({
//       paymentId,
//       amount,
//     });

//     if (!resettleResponse.success) {
//       throw new HttpException(
//         { status: 'ERROR', message: 'Failed to manually resettle transaction' },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     return {
//       balance: resettleResponse.data.balance,
//       correlationNumber,
//       status: 'OK',
//     };
//   }
// }
