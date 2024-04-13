/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export class XpressErrorHandler{

    invalidRemoteServiceIdentifier(){
        return {status: false, code: 101, message: 'Invalid remote service identifier.'}
    }

    invalidPlatformIdentifier(){
        return {status: false, code: 102, message: 'Invalid platform identifier.'}
    }

    malformedRequest(){
        return {status: false, code: 103, message: 'Incomplete or malformed request.'}
    }

    unknownRequest(){
        return {status: false, code: 104, message: 'Unknown Request'}
    }

    requestProcessingServiceUnavailable(){
        return {status: false, code: 105, message: 'Request processing services unavailable.', data: null}
    }

    invalidSecureToken(){
        return {status: false, code: 106, message: 'Invalid secure token', data: null}
    }

    insufficientFunds(){
        return {status: false, code: 107, message: 'Insufficient funds', data: null}
    }

    playerAccountLocked(){
        return {status: false, code: 108, message: 'Player account locked', data: null}
    }

    wagerLimitExceeded(){
        return {status: false, code: 109, message: 'Wager limit exceeded', data: null}
    }

    transactionFailed(){
        return {status: false, code: 110, message: 'Transaction failed', data: null}
    }

    unsupportedGameId(){
        return {status: false, code: 111, message: 'Unsupported game ID', data: null}
    }

    gameCycleNotExist(){
        return {status: false, code: 112, message: 'Game cycle does not exist', data: null}
    }

    incorrectParameters(){
        return {status: false, code: 113, message: 'Incorrect parameters for a player session', data: null}
    }

    incorrectIdentifier(){
        return {status: false, code: 114, message: 'Incorrect player identifier for secure token', data: null}
    }

    gameCycleExist(){
        return {status: false, code: 115, message: 'Game cycle exist.', data: null}
    }

    transactionExist(){
        return {status: false, code: 116, message: 'Transaction already exists', data: null}
    }

    transactionNotExist(){
        return {status: false, code: 117, message: 'Transaction does not exist', data: null}
    }

    gameCycleClosed(){
        return {status: false, code: 118, message: 'Game cycle already closed', data: null}
    }

    networkBlocked(){
        return {status: false, code: 901, message: 'Network blocked', data: null}
    }

    heavyLoad(){
        return {status: false, code: 902, message: 'Server is under heavy load', data: null}
    }

    internalError(){
        return {status: false, code: 903, message: 'Internal Error', data: null}
    }

    generalError(){
        return {status: false, code: 904, message: 'General Error', data: null}
    }

}
