import { Injectable } from '@nestjs/common';
import { Game as GameEntity } from '../entities/game.entity';
import { Game as GameProto } from '../proto/gaming.pb';

@Injectable()
export class EntityToProtoService {
  entityToProto(entity: GameEntity): GameProto {
    const proto: GameProto = {
      id: entity.id,
      gameId: entity.gameId,
      title: entity.title,
      description: entity.description,
      url: entity.url,
      imagePath: entity.imagePath,
      bannerPath: entity.bannerPath,
      status: entity.status,
      type: entity.type,
      provider: {
        id: entity.provider.id,
        slug: entity.provider.slug,
        name: entity.provider.name,
        description: entity.provider.description,
        imagePath: entity.provider.imagePath,
        parentProvider: entity.provider.parentProvider,
        createdAt: entity.provider.createdAt as any,
        updatedAt: entity.provider.updatedAt as any,
      },
      createdAt: entity.createdAt as any,
      updatedAt: entity.updatedAt as any,
    };
    return proto;
  }

  protoToEntity(proto: GameProto): GameEntity {
    const entity = new GameEntity();
    entity.id = proto.id;
    entity.gameId = proto.gameId;
    entity.title = proto.title;
    entity.description = proto.description;
    entity.url = proto.url;
    entity.imagePath = proto.imagePath;
    entity.bannerPath = proto.bannerPath;
    entity.status = proto.status;
    entity.type = proto.type;
    entity.provider = proto.provider as any;
    entity.createdAt = proto.createdAt as any;
    entity.updatedAt = proto.updatedAt as any;
    return entity;
  }
}
