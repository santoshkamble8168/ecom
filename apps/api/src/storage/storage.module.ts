import { Global, Module } from "@nestjs/common";

import { ObjectStorageService } from "./object-storage.service";
import { MediaController } from "./media.controller";

@Global()
@Module({
  controllers: [MediaController],
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
