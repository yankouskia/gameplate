import { Application, Rectangle } from 'pixi.js';
import _ from 'lodash';
import smile, { events as smileEvents } from './circle';

const app = new Application(800, 600, { backgroundColor: 0x1099bb });

app.stage.addChild(smile);
app.stage.interactive = true;
app.stage.hitArea = new Rectangle(0, 0, 800, 600);

_.forOwn(smileEvents, (value, key) => {
    app.stage.on(key, value);
});

export default app;
