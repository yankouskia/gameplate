import _ from 'lodash';
import { CIRCLE_LEFT_UP, CIRCLE_LEFT_DOWN, CIRCLE_RIGHT_UP, CIRCLE_RIGHT_DOWN } from '../constants/actions';

export default function circleReducer(state = { x: 0, y: 0 }, action) {
    const { x: xPosition, y: yPosition } = state;

    switch (action.type) {
    case CIRCLE_LEFT_UP:
        return _.assign(state, { x: xPosition - 20, y: yPosition + 20 });
    case CIRCLE_LEFT_DOWN:
        return _.assign(state, { x: xPosition - 20, y: yPosition - 20 });
    case CIRCLE_RIGHT_UP:
        return _.assign(state, { x: xPosition + 20, y: yPosition + 20 });
    case CIRCLE_RIGHT_DOWN:
        return _.assign(state, { x: xPosition + 20, y: yPosition - 20 });
    }
    return state;
}
