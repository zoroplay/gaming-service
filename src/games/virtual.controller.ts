import { Controller, Provider } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { GAMING_SERVICE_NAME, XpressRequest, XpressResponse } from 'src/proto/gaming.pb';
import { VirtualService } from 'src/services/virtual.service';

@Controller('virtual')
export class VirtualController {

    constructor(private readonly virtualService: VirtualService) {}

 
    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressLogin')
    xpressLogin(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.doXpressLogin(request);
    }

    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressBalance')
    xpressBalance(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.getBalance(request);
    }

    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressDebit')
    xpressDebit(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.doDebit(request);
    }

    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressCredit')
    xpressCredit(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.doCredit(request);
    }

    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressRollback')
    xpressRollback(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.doRollback(request);
    }

    @GrpcMethod(GAMING_SERVICE_NAME, 'xpressLogout')
    xpressLogout(request: XpressRequest): Promise<XpressResponse>{
        return this.virtualService.doLogout(request);
    }
}
