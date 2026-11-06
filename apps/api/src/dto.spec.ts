import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateReservationDto } from './dto';
describe('CreateReservationDto', () => {
  it('rejects an invalid reservation', async () => {
    const dto = Object.assign(new CreateReservationDto(), {
      date: 'bad',
      time: '',
      guests: 0,
      name: '',
      email: 'bad',
      phone: '',
      consent: false,
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
