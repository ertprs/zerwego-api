import { ExpressMiddlewareInterface, HttpError, NotFoundError } from "routing-controllers";
import { UserDAO } from "../models/user-model";
import { TripDAO } from "../models/trip-model";
import * as jwt from 'jsonwebtoken';
import { Service, Inject } from "typedi";
import { CONSTANTS } from '../persist/constants'
import { SecureService } from "../services/secure-service";
import { SecureDAO } from "../models/secure-model";

@Service()
export class Authenticate implements ExpressMiddlewareInterface {
    @Inject() private secureService: SecureService;
    @Inject() private tripDAO: TripDAO;

    private isAdmin: boolean;

    constructor(isAdmin: boolean) {
        this.isAdmin = isAdmin;
    }  
    
    async use(request: any, response: any, next: (err?: any) => Promise<any>) {
        let accessToken = request.header('Authorization');  
        let refreshToken = request.header('Refresh_token');  
        try {
            if (!accessToken) {
                throw new HttpError(401, 'No authorization token provided');
            }

            if (accessToken.startsWith('Bearer ')) {
                // Remove Bearer from string
                accessToken = accessToken.slice(7, accessToken.length);
            }   

            if (accessToken && await this.secureService.accessTokenIsExpired(accessToken)) {
                const tokens = await this.secureService.refreshTokens(refreshToken);
                refreshToken = tokens.refreshToken;
            }

            const decoded = jwt.verify(accessToken, CONSTANTS.ACCESS_TOKEN_SECRET, null);

            if (typeof decoded === 'undefined') {
                throw new HttpError(401, 'Authorizationt token cannot be decoded');
            };

           const user = decoded['payload'];
          
           if (!user) {
                throw new HttpError(401, 'This token is not related to any user');
           };

           if (request.url.includes('/trips') && this.isAdmin) {
                const tripId: string = request.params.id;
                const isTripAdmin = await this.isUserTripAdmin(user.id, tripId);
                if (!isTripAdmin) { 
                    throw new HttpError(401, 'Only administrator can perform this task');             
                };
            }
            request.user = user;
            request.token = accessToken;
            response.set('Authorization', accessToken);
            response.set('Refresh_token', refreshToken);
            next(); 
        } catch(err) {
            response.status(err.httpCode ? err.httpCode : 401).send(err)
        }

    }

    private async isUserTripAdmin(userId: string, tripId: string): Promise<boolean> {
        const result = await this.tripDAO.find({find: {
            id: tripId,
            adminId: userId
        }});
        return result.length > 0;
    }

}

// @Middleware()
export class AdminOnly extends Authenticate implements ExpressMiddlewareInterface {
    constructor() {
        super(true);
    }
}
