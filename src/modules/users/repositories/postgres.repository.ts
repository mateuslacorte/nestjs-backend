import {InjectRepository} from "@nestjs/typeorm";
import {ConflictException, Injectable, NotFoundException, Optional} from "@nestjs/common";
import {UserEntity} from "@modules/users/entities/user.entity";
import {Brackets, FindOptionsWhere, Not, Repository} from "typeorm";
import {
    IUser,
    UserSearchRepoFilter,
} from "@modules/users/interfaces/user.interface";
import {EnableCache, NoCache} from "@common/cache/decorators/cache.decorator";
import {CacheService} from "@common/cache/cache.service";
import {CreateUserDto} from "../dtos/create-user.dto";
import { hashPassword, isPasswordHashed } from '@common/crypto/password.util';

@Injectable()
export class UserPostgresRepository {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @Optional()
        private cacheService?: CacheService
    ) {}

    /**
     * Create a new user in the PostgreSQL database
     * @param createUserDto - User data to create
     * @param includePassword - Whether to return the password hash
     * @returns The created user
     */
    @EnableCache()
    async create(createUserDto: CreateUserDto, includePassword = false): Promise<IUser> {
        const { username, email, password, googleId, facebookId, twitterId, githubId, figmaId, linkedinId, slackId, atlassianId, gitlabId, bitbucketId, discordId, twitchId, steamId, appleId, amazonId, patreonId, dropboxId, metamaskId, activeDirectoryId } = createUserDto;

        const existingUser = await this.userRepository.findOne({
            where: [{ email }, { username }],
        });
        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        if (googleId) {
            const existingGoogle = await this.userRepository.findOne({
                where: { googleId },
            });
            if (existingGoogle) {
                throw new ConflictException('User with this Google account already exists');
            }
        }

        if (facebookId) {
            const existingFacebook = await this.userRepository.findOne({
                where: { facebookId },
            });
            if (existingFacebook) {
                throw new ConflictException('User with this Facebook account already exists');
            }
        }

        if (twitterId) {
            const existingTwitter = await this.userRepository.findOne({
                where: { twitterId },
            });
            if (existingTwitter) {
                throw new ConflictException('User with this Twitter account already exists');
            }
        }

        if (githubId) {
            const existingGithub = await this.userRepository.findOne({
                where: { githubId },
            });
            if (existingGithub) {
                throw new ConflictException('User with this GitHub account already exists');
            }
        }

        if (figmaId) {
            const existingFigma = await this.userRepository.findOne({
                where: { figmaId },
            });
            if (existingFigma) {
                throw new ConflictException('User with this Figma account already exists');
            }
        }

        if (linkedinId) {
            const existingLinkedin = await this.userRepository.findOne({
                where: { linkedinId },
            });
            if (existingLinkedin) {
                throw new ConflictException('User with this LinkedIn account already exists');
            }
        }

        if (slackId) {
            const existingSlack = await this.userRepository.findOne({
                where: { slackId },
            });
            if (existingSlack) {
                throw new ConflictException('User with this Slack account already exists');
            }
        }

        if (atlassianId) {
            const existingAtlassian = await this.userRepository.findOne({
                where: { atlassianId },
            });
            if (existingAtlassian) {
                throw new ConflictException('User with this Atlassian account already exists');
            }
        }

        if (gitlabId) {
            const existingGitlab = await this.userRepository.findOne({
                where: { gitlabId },
            });
            if (existingGitlab) {
                throw new ConflictException('User with this GitLab account already exists');
            }
        }

        if (bitbucketId) {
            const existingBitbucket = await this.userRepository.findOne({
                where: { bitbucketId },
            });
            if (existingBitbucket) {
                throw new ConflictException('User with this Bitbucket account already exists');
            }
        }

        if (discordId) {
            const existingDiscord = await this.userRepository.findOne({
                where: { discordId },
            });
            if (existingDiscord) {
                throw new ConflictException('User with this Discord account already exists');
            }
        }

        if (twitchId) {
            const existingTwitch = await this.userRepository.findOne({
                where: { twitchId },
            });
            if (existingTwitch) {
                throw new ConflictException('User with this Twitch account already exists');
            }
        }

        if (steamId) {
            const existingSteam = await this.userRepository.findOne({
                where: { steamId },
            });
            if (existingSteam) {
                throw new ConflictException('User with this Steam account already exists');
            }
        }


        if (appleId) {
            const existingApple = await this.userRepository.findOne({
                where: { appleId },
            });
            if (existingApple) {
                throw new ConflictException('User with this Apple account already exists');
            }
        }

        if (amazonId) {
            const existingAmazon = await this.userRepository.findOne({
                where: { amazonId },
            });
            if (existingAmazon) {
                throw new ConflictException('User with this Amazon account already exists');
            }
        }


        if (patreonId) {
            const existingPatreon = await this.userRepository.findOne({
                where: { patreonId },
            });
            if (existingPatreon) {
                throw new ConflictException(
                    'User with this Patreon account already exists',
                );
            }
        }

        if (dropboxId) {
            const existingDropbox = await this.userRepository.findOne({
                where: { dropboxId },
            });
            if (existingDropbox) {
                throw new ConflictException(
                    'User with this Dropbox account already exists',
                );
            }
        }

        if (metamaskId) {
            const existingMetamask = await this.userRepository.findOne({
                where: { metamaskId },
            });
            if (existingMetamask) {
                throw new ConflictException(
                    'User with this MetaMask account already exists',
                );
            }
        }

        if (activeDirectoryId) {
            const existingAd = await this.userRepository.findOne({
                where: { activeDirectoryId },
            });
            if (existingAd) {
                throw new ConflictException(
                    'User with this Active Directory account already exists',
                );
            }
        }

        const hashedPassword = password
            ? await hashPassword(password)
            : null;

        const newUser = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
            googleId: googleId ?? null,
            facebookId: facebookId ?? null,
            twitterId: twitterId ?? null,
            githubId: githubId ?? null,
            figmaId: figmaId ?? null,
            linkedinId: linkedinId ?? null,
            slackId: slackId ?? null,
            atlassianId: atlassianId ?? null,
            gitlabId: gitlabId ?? null,
            bitbucketId: bitbucketId ?? null,
            discordId: discordId ?? null,
            twitchId: twitchId ?? null,
            steamId: steamId ?? null,
            appleId: appleId ?? null,
            amazonId: amazonId ?? null,
            patreonId: patreonId ?? null,
            dropboxId: dropboxId ?? null,
            metamaskId: metamaskId ?? null,
            activeDirectoryId: activeDirectoryId ?? null,
            isActive: createUserDto.isActive ?? true,
            roles: createUserDto.roles ?? [],
        });

        const savedUser = await this.userRepository.save(newUser);
        this.cacheService?.delPattern("typeorm:users:user:*");

        return includePassword ? savedUser : this.omitPassword(savedUser);
    }

    /**
     * Search users with keyset cursor pagination
     */
    @NoCache()
    async search(filter: UserSearchRepoFilter): Promise<IUser[]> {
        const qb = this.userRepository.createQueryBuilder('u');

        if (typeof filter.isActive === 'boolean') {
            qb.andWhere('u.isActive = :isActive', { isActive: filter.isActive });
        }

        if (filter.q?.trim()) {
            const q = `%${filter.q.trim()}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where('u.email ILIKE :q', { q })
                        .orWhere('u.username ILIKE :q', { q })
                        .orWhere('u.firstName ILIKE :q', { q })
                        .orWhere('u.lastName ILIKE :q', { q });
                }),
            );
        }

        if (filter.cursorCreatedAt && filter.cursorId) {
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where('u.createdAt < :cursorCreatedAt', {
                        cursorCreatedAt: filter.cursorCreatedAt,
                    }).orWhere(
                        '(u.createdAt = :cursorCreatedAt AND u.id < :cursorId)',
                        {
                            cursorCreatedAt: filter.cursorCreatedAt,
                            cursorId: filter.cursorId,
                        },
                    );
                }),
            );
        }

        const users = await qb
            .orderBy('u.createdAt', 'DESC')
            .addOrderBy('u.id', 'DESC')
            .take(filter.limit)
            .getMany();

        return users.map((user) => this.omitPassword(user));
    }

    /**
     * Find a user by ID
     * @param id - The user ID
     * @param includePassword - Whether to return the password hash
     * @returns The user or null if not found
     */
    @EnableCache()
    async findById(id: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by email
     * @param email - The user's email
     * @param includePassword - Whether to return the password hash
     * @returns The user or null if not found
     */
    @NoCache()
    async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    @NoCache()
    async findByUsername(username: string): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { username } });
        return user ? this.omitPassword(user) : null;
    }

    /**
     * Find a user by Google subject ID
     */
    @NoCache()
    async findByGoogleId(googleId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { googleId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Facebook subject ID
     */
    @NoCache()
    async findByFacebookId(facebookId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { facebookId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by X / Twitter subject ID
     */
    @NoCache()
    async findByTwitterId(twitterId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { twitterId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by GitHub subject ID
     */
    @NoCache()
    async findByGithubId(githubId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { githubId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Figma subject ID
     */
    @NoCache()
    async findByFigmaId(figmaId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { figmaId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by LinkedIn OpenID subject ID
     */
    @NoCache()
    async findByLinkedinId(linkedinId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { linkedinId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Slack OpenID subject ID
     */
    @NoCache()
    async findBySlackId(slackId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { slackId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Atlassian account ID
     */
    @NoCache()
    async findByAtlassianId(atlassianId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { atlassianId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by GitLab user ID
     */
    @NoCache()
    async findByGitlabId(gitlabId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { gitlabId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Bitbucket user UUID
     */
    @NoCache()
    async findByBitbucketId(bitbucketId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { bitbucketId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Discord snowflake user ID
     */
    @NoCache()
    async findByDiscordId(discordId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { discordId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Twitch user ID
     */
    @NoCache()
    async findByTwitchId(twitchId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { twitchId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by SteamID64
     */
    @NoCache()
    async findBySteamId(steamId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { steamId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Amazon user ID
     */
    @NoCache()
    async findByAmazonId(
        amazonId: string,
        includePassword = false,
    ): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { amazonId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Patreon user ID
     */
    @NoCache()
    async findByPatreonId(
        patreonId: string,
        includePassword = false,
    ): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { patreonId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Dropbox account ID
     */
    @NoCache()
    async findByDropboxId(
        dropboxId: string,
        includePassword = false,
    ): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { dropboxId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by MetaMask Ethereum address
     */
    @NoCache()
    async findByMetamaskId(
        metamaskId: string,
        includePassword = false,
    ): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { metamaskId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Active Directory objectGUID
     */
    @NoCache()
    async findByActiveDirectoryId(
        activeDirectoryId: string,
        includePassword = false,
    ): Promise<IUser | null> {
        const user = await this.userRepository.findOne({
            where: { activeDirectoryId },
        });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by Apple subject ID
     */
    @NoCache()
    async findByAppleId(appleId: string, includePassword = false): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { appleId } });
        if (!user) {
            return null;
        }
        return includePassword ? user : this.omitPassword(user);
    }

    /**
     * Find a user by email verification token
     * @param token - The email verification token
     * @returns The user or null if not found
     */
    @NoCache()
    async findByEmailVerificationToken(token: string): Promise<IUser | null> {
        const user = await this.userRepository.findOne({
            where: { emailVerificationToken: token }
        });
        return user ? this.omitPassword(user) : null;
    }

    /**
     * Find a user by password reset token
     * @param token - The password reset token
     * @returns The user or null if not found
     */
    @NoCache()
    async findByPasswordToken(token: string): Promise<IUser | null> {
        const user = await this.userRepository.findOne({ where: { passwordResetToken: token } });
        return user ? this.omitPassword(user) : null;
    }

    /**
     * Update a user by ID
     * @param id - User ID
     * @param updateUserDto - Fields to update
     * @param shouldOmitPassword - Whether to omit password from the returned user
     * @returns The updated user
     */
    @EnableCache()
    async update(id: string, updateUserDto: Partial<IUser>, shouldOmitPassword = true): Promise<IUser> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (updateUserDto.password && !isPasswordHashed(updateUserDto.password)) {
            updateUserDto.password = await hashPassword(updateUserDto.password);
        }

        if (updateUserDto.username || updateUserDto.email) {
            const conflicts: FindOptionsWhere<UserEntity>[] = [];
            if (updateUserDto.username) {
                conflicts.push({ username: updateUserDto.username, id: Not(id) });
            }
            if (updateUserDto.email) {
                conflicts.push({ email: updateUserDto.email, id: Not(id) });
            }

            const existingUser = await this.userRepository.findOne({ where: conflicts });
            if (existingUser) {
                throw new ConflictException('Username or email already in use');
            }
        }

        Object.assign(user, updateUserDto);
        const updatedUser = await this.userRepository.save(user);
        this.cacheService?.delPattern("typeorm:users:user:*");

        return shouldOmitPassword ? this.omitPassword(updatedUser) : updatedUser;
    }

    /**
     * Remove a user by ID
     * @param id - User ID
     * @returns The removed user
     */
    @EnableCache()
    async remove(id: string): Promise<IUser> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        await this.userRepository.remove(user);
        this.cacheService?.delPattern("typeorm:users:user:*");

        return this.omitPassword(user);
    }

    /**
     * Upsert a user in the PostgreSQL database
     * @param userData - The user data to upsert
     * @returns The created or updated user
     */
    @EnableCache()
    async upsert(userData: IUser): Promise<IUser> {
        let user: UserEntity | null = null;

        if (userData.id) {
            user = await this.userRepository.findOne({ where: { id: userData.id } });
        }

        if (!user && userData.email) {
            user = await this.userRepository.findOne({ where: { email: userData.email } });
        }

        if (user) {
            const dataToUpdate = userData.password
                ? userData
                : (({ password, ...rest }) => rest)(userData);

            Object.assign(user, dataToUpdate);
            const userSaved = await this.userRepository.save(user);
            this.cacheService?.delPattern("typeorm:users:user:*");
            return this.omitPassword(userSaved);
        } else {
            const newUser = this.userRepository.create({
                ...userData,
                password: userData.password ?? null,
            });
            const newUserSaved = await this.userRepository.save(newUser);
            this.cacheService?.delPattern("typeorm:users:user:*");
            return this.omitPassword(newUserSaved);
        }
    }

    private omitPassword(user: UserEntity): IUser {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
    }
}
