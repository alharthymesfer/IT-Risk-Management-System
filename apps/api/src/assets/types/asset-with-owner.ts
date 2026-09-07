import { Asset } from '@prisma/client';
import { SafeUser } from '../../common/types/safe-user';

export type AssetWithOwner = Asset & { owner: SafeUser };
