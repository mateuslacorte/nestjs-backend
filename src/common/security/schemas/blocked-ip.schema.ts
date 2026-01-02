import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BlockedIp extends Document {
    @Prop({ type: String, required: true, unique: true })
    id!: string;

    @Prop({ type: String, required: true, unique: true })
    ip!: string;

    @Prop({ type: Number, default: 0 })
    attempts!: number;

    @Prop({ type: Boolean, default: false })
    blocked!: boolean;

    @Prop({ type: Date })
    blockedAt?: Date;

    @Prop({ type: Date, required: true })
    lastAttemptAt!: Date;

    @Prop({ type: [String], default: [] })
    paths!: string[];

    @Prop({ type: String })
    userAgent?: string;

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;
}

export const BlockedIpSchema = SchemaFactory.createForClass(BlockedIp);

// Indexes
BlockedIpSchema.index({ ip: 1 }, { unique: true });
BlockedIpSchema.index({ blocked: 1 });
