import { Texture, Sprite } from 'pixi.js';
import store from '../store';
import smileImage from '../resources/smile.png';
import {
    CIRCLE_LEFT_UP,
    CIRCLE_LEFT_DOWN,
    CIRCLE_RIGHT_UP,
    CIRCLE_RIGHT_DOWN
} from '../constants/actions';

const state = store.getState();
const smile = Texture.fromImage(smileImage);
const smileSprite = new Sprite(smile);

smileSprite.width = 120;
smileSprite.height = 100;

function updateCircle() {
    smileSprite.x = state.circle.x;
    smileSprite.y = state.circle.y;
}

updateCircle();
store.subscribe(updateCircle);

function _onMouseDown(ev) {
    const { x: eventX, y: eventY } = ev.data.global;
    const { x: smileX, y: smileY } = smileSprite;

    const x = eventX - (smileSprite.width / 2);
    const y = eventY - (smileSprite.height / 2);

    if (x >= smileX && y >= smileY) {
        return store.dispatch({ type: CIRCLE_RIGHT_UP });
    }
    if (x <= smileX && y >= smileY) {
        return store.dispatch({ type: CIRCLE_LEFT_UP });
    }
    if (x >= smileX && y <= smileY) {
        return store.dispatch({ type: CIRCLE_RIGHT_DOWN });
    }

    return store.dispatch({ type: CIRCLE_LEFT_DOWN });
}

export const events = {
    mousedown: _onMouseDown
};
export default smileSprite;
