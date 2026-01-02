import { Field, ID, ObjectType } from '@nestjs/graphql';
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
    password!: string;

    @Field()
    isActive!: boolean;

    @Field(() => [String])
    roles!: string[];

    // These fields are for internal use and not exposed via GraphQL
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}