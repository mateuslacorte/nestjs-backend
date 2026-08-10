import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@modules/auth/enums/role.enum';

@Schema({ timestamps: true })
export class User extends Document<string> {
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

  @Prop({ type: String, required: false, default: null })
  password!: string | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: [Role.USER] })
  roles!: Role[];

  @Prop({ type: String, unique: true, sparse: true, default: null })
  googleId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  facebookId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  twitterId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  githubId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  figmaId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  linkedinId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  slackId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  atlassianId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  gitlabId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  bitbucketId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  discordId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  twitchId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  steamId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  redditId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  appleId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  amazonId?: string | null;


  @Prop({ type: String, unique: true, sparse: true, default: null })
  patreonId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  dropboxId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  metamaskId?: string | null;

  @Prop({ type: String, unique: true, sparse: true, default: null })
  activeDirectoryId?: string | null;

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
