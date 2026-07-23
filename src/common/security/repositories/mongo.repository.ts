import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockedIp } from '../schemas/blocked-ip.schema';
import { IBlockedIp } from '../interfaces/blocked-ip.interface';

/**
 * CQRS-ready Mongo store for blocked IPs.
 * Not used by SecurityService today (Postgres is the active store).
 */
@Injectable()
export class BlockedIpMongoRepository {
    constructor(
        @InjectModel(BlockedIp.name)
        private readonly blockedIpModel: Model<BlockedIp>,
    ) {}

    async findByIp(ip: string): Promise<IBlockedIp | null> {
        const doc = await this.blockedIpModel.findOne({ ip }).lean();
        return doc ? (doc as unknown as IBlockedIp) : null;
    }

    async findBlocked(): Promise<IBlockedIp[]> {
        return this.blockedIpModel
            .find({ blocked: true })
            .sort({ blockedAt: -1 })
            .lean() as unknown as Promise<IBlockedIp[]>;
    }

    async findSuspicious(): Promise<IBlockedIp[]> {
        return this.blockedIpModel
            .find({ blocked: false })
            .sort({ attempts: -1 })
            .lean() as unknown as Promise<IBlockedIp[]>;
    }

    async create(data: Partial<IBlockedIp>): Promise<IBlockedIp> {
        const doc = new this.blockedIpModel(data);
        await doc.save();
        return doc.toObject() as unknown as IBlockedIp;
    }

    async updateById(
        id: string,
        data: Partial<IBlockedIp>,
        pathToPush?: string,
        maxPathsStored?: number,
    ): Promise<void> {
        const update: Record<string, unknown> = { $set: data };
        if (pathToPush && maxPathsStored != null) {
            update.$push = {
                paths: {
                    $each: [pathToPush],
                    $slice: -maxPathsStored,
                },
            };
        }
        await this.blockedIpModel.findOneAndUpdate({ id }, update);
    }

    async deleteById(id: string): Promise<void> {
        await this.blockedIpModel.deleteOne({ id });
    }
}
