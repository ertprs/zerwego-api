const debug = require('debug')('http');
import {JsonController, Body, Put, Param, Patch, UseBefore} from "routing-controllers";
import { IUser } from "../models/user-model";
import { Service, Inject } from "typedi";
import { UserService } from "../services/user-service";
import { Authenticate } from "../middlewares/auth-middleware";

@JsonController('/users')
@Service()
export class UserController {
  @Inject() private userService: UserService;
  
  constructor() { }

  @UseBefore(Authenticate)
  @Put('/:id/update')
  async updateUser(@Param('id') id: string , @Body() user: IUser) {
    const updatedUser: IUser = await this.userService.updateUser(user, id);
    debug('POST /users/update => Successfully updated!');
    return updatedUser;
  }

  @UseBefore(Authenticate)
  @Patch('/:id/update-password')
  async updateUserPassord(@Param('id') id: string, @Body() passwords: { oldPassword: string, newPassword: string }) {
    console.log('*****************************************************************************');
    console.log(passwords.oldPassword, passwords.newPassword);
    console.log('*****************************************************************************');
    await this.userService.handleChangePassword(id, passwords.oldPassword, passwords.newPassword);
    debug('POST /users/update-password => Successfully updated!');
    return 'Password successfully updated!';
  }
 
}
