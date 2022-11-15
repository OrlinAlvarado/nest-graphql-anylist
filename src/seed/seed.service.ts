import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { Item } from '../items/entities/item.entity'
import { UsersService } from '../users/users.service'
import { SEED_ITEMS, SEED_USERS } from './data/seed-data';
import { ItemsService } from '../items/items.service'

@Injectable()
export class SeedService {

    private isProd: boolean
    constructor(
        private readonly configService: ConfigService,
        
        @InjectRepository(Item)
        private readonly itemsRepository: Repository<Item>,

        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        private readonly usersService: UsersService,

        private readonly itemsService: ItemsService,

    ){
        this.isProd =  configService.get('STATE') === 'prod'
    }

    async executeSeed() {

        if ( this.isProd ) {
            throw new UnauthorizedException('We cannot run SEED on Prod');
        }

        // Limpiar la base de datos, BORRAR TODO
        await this.deleteDatabase();

        // Crear usuarios
        const users = await this.loadUsers();

        // Crear items
        await this.loadItems( users );

        return true
    }

    async deleteDatabase() {
        await this.itemsRepository.createQueryBuilder()
            .delete()
            .where({})
            .execute()

        await this.usersRepository.createQueryBuilder()
            .delete()
            .where({})
            .execute()
    }

    async loadUsers(): Promise<User[]> {
        const users = []

        for (const user of SEED_USERS) {
            users.push( await this.usersService.create( user ))
        }

        return users;
    }

    async loadItems(users: User[]) : Promise<void> {
        let counter = 0
        const itemsPromises = []
        for (const item of SEED_ITEMS) {
            const user = users[counter]
            itemsPromises.push(this.itemsService.create(item, user))

            if ( counter < 2) {
                counter++
            } else { 
                counter = 0
            }
        }

        await Promise.all( itemsPromises )
    }
}
