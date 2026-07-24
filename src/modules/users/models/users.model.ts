import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from "@modules/users/interfaces/user.interface";

@ObjectType()
export class UserModel implements IUser {
    @Field(() => ID, { nullable: true })
    id?: string;

    @Field()
    username!: string;

    @Field()
    firstName!: string;

    @Field()
    lastName!: string;

    @Field()
    email!: string;

    // Exclude password from GraphQL responses for security
    password!: string | null;

    @Field(() => String, { nullable: true })
    googleId?: string | null;

    @Field(() => String, { nullable: true })
    facebookId?: string | null;

    @Field(() => String, { nullable: true })
    twitterId?: string | null;

    @Field()
    isActive!: boolean;

    @Field(() => [Role])
    roles!: Role[];

    // These fields are for internal use and not exposed via GraphQL
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}
