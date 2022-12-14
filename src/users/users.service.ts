import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { SignupInput } from '../auth/dto/inputs/signup.input';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ValidRoles } from '../auth/enums/valid-roles.enum'
import { PaginationArgs, SearchArgs } from '../common/dto/args'

@Injectable()
export class UsersService {

  private logger = new Logger('UsersService')

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async create( signupInput: SignupInput): Promise<User> {
    try {
      const newUser = this.usersRepository.create({
        ...signupInput,
        password: bcrypt.hashSync( signupInput.password, 10)
      })
      return await this.usersRepository.save(newUser)
    } catch (error) {
      this.handleDBErrors(error)
    }
  }

  async findAll( 
    roles: ValidRoles[], 
    paginationArgs: PaginationArgs, 
    searchArgs: SearchArgs
  ): Promise<User[]> {

    const { limit, offset } = paginationArgs
    const { search } =  searchArgs

    const queryBuilder = this.usersRepository.createQueryBuilder()
      .limit( limit )
      .take( offset )

    if (roles.length !== 0) {
      queryBuilder
      .andWhere('ARRAY[roles] && ARRAY[:...roles]')
      .setParameter('roles', roles)
    } 

    if (search) {
      queryBuilder.andWhere('LOWER(fullName) like :name', { name: `%${ search.toLowerCase() }%`})  
    }

    return await queryBuilder.getMany()

  }

  async findOnByEmail(email: string): Promise<User> {
    
    try {
      return await this.usersRepository.findOneByOrFail({ email })
    } catch (error) {
      throw new NotFoundException(`${ email } not found`)
      // this.handleDBErrors(error)
    }
    
  }

  async findOnById(id: string): Promise<User> {
    
    try {
      return await this.usersRepository.findOneByOrFail({ id })
    } catch (error) {
      throw new NotFoundException(`${ id } not found`)
      // this.handleDBErrors(error)
    }
    
  }

  async update(updateUserInput: UpdateUserInput, adminUser: User): Promise<User> {
    try {
      const user = await this.usersRepository.preload({
        ...updateUserInput
      })
      user.lastUpdatedBy = adminUser;
      return await this.usersRepository.save(user);
      
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async block(id: string, adminUser: User): Promise<User> {
    const userToBlock = await this.findOnById( id );
    userToBlock.isActive = false
    userToBlock.lastUpdatedBy = adminUser;
    return await this.usersRepository.save( userToBlock );
  }

  private handleDBErrors( error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException( error.detail.replace('Key ', ''))
    }
    this.logger.error( error )
    throw new InternalServerErrorException('Please chec server logs')
  }
}
