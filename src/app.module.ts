import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController, AdminService } from './admin.js';
import { ApplicationsController, ApplicationsService } from './applications.js';
import { AuthController, AuthService } from './auth.js';
import { ChatController, ChatService } from './chat.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { dataSourceOptions } from './db.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: dataSourceOptions })],
  controllers: [HealthController, AuthController, CoursesController, ApplicationsController, AdminController, ChatController],
  providers: [AuthService, CoursesService, ApplicationsService, AdminService, ChatService],
})
export class AppModule {}
