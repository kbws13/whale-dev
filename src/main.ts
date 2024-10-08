import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@/common/expection/http-exception.filter';
import * as session from 'express-session';
import { SESSION } from '@/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { LogInterceptor } from "@/aop/log.interceptor";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    session({
      secret: SESSION.secret, // 加密
      rolling: true,  // 每次请求添加cookie
      name: SESSION.name, // 存在浏览器cookie中的key
      cookie: { maxAge: null }, // 过期时间 ms 
    }),
  );

  // 捕获class-validator抛出的异常，重新抛出HttpException，在AllExceptionsFilter中捕获
  app.useGlobalPipes(new ValidationPipe({
    exceptionFactory: (validationErrors = []) => {
      const formattedErrors = validationErrors.reduce((acc, error) => {
        acc[error.property] = Object.values(error.constraints)
        return acc;
      }, {});

      return new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: formattedErrors,
      }, HttpStatus.BAD_REQUEST);
    },
  }));

  // 捕获所有的错误
  app.useGlobalFilters(new AllExceptionsFilter())

  // 静态资源的展示
  app.useStaticAssets('src/assets/images', {prefix: '/images'})

  // 全局绑定日志拦截器，打印请求日志
  app.useGlobalInterceptors(new LogInterceptor())

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('低代码平台后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3001);
}
bootstrap();
