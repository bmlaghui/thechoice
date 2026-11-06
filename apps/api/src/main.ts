import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(resolve(process.env.UPLOAD_DIR??resolve(process.cwd(),'../web/public/uploads')),{prefix:'/uploads/'});
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],imgSrc:["'self'","data:","blob:"],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'"],connectSrc:["'self'",...(process.env.CORS_ORIGINS??'http://localhost:4200').split(',')]}},strictTransportSecurity:process.env.NODE_ENV==='production'?{maxAge:31_536_000,includeSubDomains:true,preload:true}:false,referrerPolicy:{policy:'strict-origin-when-cross-origin'}}));
  app.use((request:{method:string;url:string;headers:{cookie?:string;'x-csrf-token'?:string}},response:{status:(code:number)=>{json:(body:object)=>void}},next:()=>void)=>{if(['GET','HEAD','OPTIONS'].includes(request.method)||!request.url.startsWith('/api/v1/admin'))return next();const cookie=request.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('tc_csrf='))?.slice(8);if(!cookie||cookie!==request.headers['x-csrf-token'])return response.status(403).json({message:'Jeton CSRF invalide'});next();});
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('The Choice API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(process.env.API_PORT ?? 3000);
}
void bootstrap();
