import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import nock from 'nock';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { AdminGuard } from '../src/auth/admin.guard';

jest.setTimeout(60000);

const describeWithDb =
  process.env.E2E_USE_MEMORY_MONGO === 'false' ? describe.skip : describe;

describeWithDb('Odds -> Bets -> Settlement (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  const mockUser = { userId: 'user1', email: 'user@example.com' };
  const mockAdminGuard = {
    canActivate: (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };
  const mockJwtGuard = {
    canActivate: (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({
      instance: { ip: '127.0.0.1' },
    });
    process.env.MONGODB_URI = mongo.getUri();
    process.env.JWT_SECRET = 'test-secret';
    process.env.ODDS_API_KEY = 'test-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    nock.cleanAll();
    if (app) {
      await app.close();
    }
    if (mongo) {
      await mongo.stop();
    }
  });

  it('seeds odds via /games/next, creates a bet, and settles it', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    nock('https://api.the-odds-api.com')
      .get('/v4/sports/basketball_nba/odds')
      .query(true)
      .reply(200, [
        {
          id: 'game-1',
          home_team: 'Cleveland Cavaliers',
          away_team: 'Boston Celtics',
          commence_time: start,
          bookmakers: [
            {
              key: 'fanduel',
              markets: [
                {
                  key: 'spreads',
                  outcomes: [
                    { name: 'Cleveland Cavaliers', point: -5.5 },
                    { name: 'Boston Celtics', point: 5.5 },
                  ],
                },
              ],
            },
          ],
        },
      ]);

    // Admin ingests odds
    const ingestRes = await request(app.getHttpServer())
      .post('/games/next')
      .expect(201);

    expect(ingestRes.body).toHaveProperty('gameId', 'game-1');

    // Place a bet
    const betRes = await request(app.getHttpServer())
      .post('/bets')
      .send({ gameId: 'game-1', side: 'home', stake: 10 })
      .expect(201);
    expect(betRes.body).toHaveProperty('status', 'pending');

    // Settle via bets endpoint
    const settleRes = await request(app.getHttpServer())
      .post('/bets/settle')
      .send({ gameId: 'game-1', finalHomeScore: 110, finalAwayScore: 100 })
      .expect(201);

    expect(Array.isArray(settleRes.body.updatedBets)).toBe(true);
    expect(settleRes.body.updatedBets[0]).toHaveProperty('status', 'won');
  });
});
