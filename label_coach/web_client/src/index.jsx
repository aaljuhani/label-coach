import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import LabelTasker from "./pages/label_tasker";
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from "./pages/login";
import {BrowserRouter as Router, Route, Link} from "react-router-dom";

class Index extends React.Component {
    render() {
        return (
            <Router>
                <div>
                    <Route exact path="/" component={LabelTasker}/>
                </div>
            </Router>
        );
    }
}

export default function main() {
    ReactDOM.render(<Index/>, document.getElementById('root'));

}
