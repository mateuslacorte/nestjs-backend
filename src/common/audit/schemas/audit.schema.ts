import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: false, collection: 'audit' })
export class Audit extends Document {
    @Prop({ required: true })
    id!: string;

    @Prop({ required: true })
    action!: string;

    @Prop()
    category?: string;

    @Prop()
    description?: string;

    @Prop({ required: true })
    ip!: string;

    @Prop({ type: Number, default: null })
    port!: number | null;

    @Prop({ required: true })
    success!: boolean;

    @Prop()
    provider?: string;

    @Prop()
    identifier?: string;

    @Prop()
    userId?: string;

    @Prop()
    failureReason?: string;

    @Prop()
    userAgent?: string;

    @Prop({ type: Object })
    metadata?: Record<string, unknown>;

    /**
     * When the audited action occurred (not document-insert time).
     */
    @Prop({ required: true, type: Date })
    timestamp!: Date;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);

AuditSchema.index({ ip: 1 });
AuditSchema.index({ success: 1 });
AuditSchema.index({ timestamp: -1 });
AuditSchema.index({ action: 1 });
AuditSchema.index({ category: 1 });
AuditSchema.index({ timestamp: -1, id: -1 });
