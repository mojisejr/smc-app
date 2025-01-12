import { BrowserWindow } from "electron";
import { User } from "../../db/model/user.model";
import  { logger } from "../logger";
import { AuthResponse } from "../interfaces/auth";

export class Authentication {
    private _currentUser = null;
    private _role = null;

    async login(passkey: string) {  
        const user = await User.findOne({ where: { passkey: passkey } });


        if(!user) {
            return null;
        }

        this._currentUser = user.dataValues.id;
        this._role = user.dataValues.role;

        return {
            id: user.dataValues.id,
            name: user.dataValues.name,
            role: user.dataValues.role
        } as AuthResponse;
    }

    async logout() {
        this._currentUser = null;
    }


    async getCurrentUser() {
        return this._currentUser;
    }

    async isAdmin() {
        return this._role === "ADMIN";
    }

}