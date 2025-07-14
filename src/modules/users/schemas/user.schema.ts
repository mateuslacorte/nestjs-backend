import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {

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
}

export const UserSchema = SchemaFactory.createForClass(User);
