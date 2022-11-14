import { Resolver, Query, Mutation, Args, Int, ID, Parent, ResolveField } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ValidRolesArgs } from './dto/args/roles.args'
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidRoles } from '../auth/enums/valid-roles.enum';
import { ItemsService } from '../items/items.service'

@Resolver(() => User)
@UseGuards( JwtAuthGuard )
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly itemsService: ItemsService
  ) {}

  @Query(() => [User], { name: 'users' })
  findAll(
    @Args() validRoles: ValidRolesArgs,
    @CurrentUser([ValidRoles.admin]) user: User
  ): Promise<User[]> {
    return this.usersService.findAll( validRoles.roles );
  }

  @Query(() => User, { name: 'user' })
  
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser([ValidRoles.admin]) user: User
  ): Promise<User> {
    return this.usersService.findOnById(id)
  }

  @Mutation(() => User, { name: 'updateUser'})
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser([ValidRoles.admin]) user: User
  ): Promise<User> {
    return this.usersService.update(updateUserInput, user);
  }

  @Mutation(() => User, { name: 'blockUser'})
  blockUser(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser([ValidRoles.admin]) user: User
  ) {
    return this.usersService.block(id, user);
  }

  @ResolveField(() =>  Int, { name: 'itemCount'})
  async itemCount(
    @CurrentUser([ValidRoles.admin]) adminUser: User,
    @Parent() user: User
  ): Promise<number> {
    return this.itemsService.itemCountByUser( user )
  }
}
