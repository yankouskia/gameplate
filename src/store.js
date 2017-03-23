import { createStore } from 'redux';
import reducers from './reducers';

export default createStore(
    reducers,
    { circle: { x: 50, y: 50 } },
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
