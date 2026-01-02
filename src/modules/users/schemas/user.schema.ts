import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String, default: () => uuidv4() })
  _id!: string;

  @Prop({required: true, unique: true})
  id!: string;

  @Prop({required: true, unique: true})
  username!: string;

  @Prop({required: true})
  firstName!: string;

  @Prop({required: true})
  lastName!: string;

  @Prop({required: true, unique: true})
  email!: string;

  @Prop({required: true})
  password!: string;

  @Prop({default: true})
  isActive!: boolean;

  @Prop({type: [String], default: ['user']})
  roles!: string[];

  @Prop({type: String, default: null})
  passwordResetToken?: string;

  @Prop({type: Date, default: null})
  passwordResetExpires?: Date;

  @Prop({type: String, default: null})
  emailVerificationToken?: string;

  @Prop({type: Date, default: null})
  emailVerificationExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
