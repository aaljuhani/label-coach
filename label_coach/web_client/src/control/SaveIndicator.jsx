import * as React from "react";
import {editSaveIndicatorText, saveLabels, setDoneStatus} from "./controlActions";
import {connect} from "react-redux";
import TimeAgo from "javascript-time-ago";
// Load locale-specific relative date/time formatting rules.
import en from 'javascript-time-ago/locale/en'
import {addTimeout} from "redux-timeout";

class SaveIndicatorP extends React.Component {
    constructor(props) {
        super(props);
        TimeAgo.locale(en);
        this.timeAgo = new TimeAgo('en-US');
    }

    static formatDate(date) {
        let monthNames = [
            "January", "February", "March",
            "April", "May", "June", "July",
            "August", "September", "October",
            "November", "December"
        ];

        let day = date.getDate();
        let monthIndex = date.getMonth();
        let year = date.getFullYear();

        return day + ' ' + monthNames[monthIndex] + ' ' + year;
    }

    handleSave() {
        this.props.save(this.props.images, this.props.labels);

    }

    render() {
        if (this.props.status === "dirty") {
            this.props.editText("Saving...");
        }
        else {
            this.props.editText("Saved " + this.timeAgo.format(this.props.lastUpdated))
        }
        return (
            <div id="save-indicator" data-toggle="tooltip" className={"save-indicator"}
                 title={"Last edit was on " +
                 SaveIndicatorP.formatDate(new Date(this.props.lastUpdated))}>{this.props.text}</div>
        );
    }

    componentDidMount() {
        this.handleSave = this.handleSave.bind(this);
        this.props.addTimeout(1000, "SET_DIRTY_STATUS", this.handleSave);
    }

}

// ---------- Container ----------

function formatSaveText(text, lastUpdated) {

}

function mapStateToProps(state) {
    return {
        status: state.saveIndicator.status,
        text: state.saveIndicator.text,
        images: state.images,
        labels: state.labels,
        lastUpdated: state.saveIndicator.lastUpdated || Date.now()
    };
}

function mapDispatchToProps(dispatch) {
    return {
        addTimeout: (timeout, action, fn) => {
            dispatch(addTimeout(timeout, action, fn))
        },
        editText: (text) => {
            dispatch(editSaveIndicatorText(text))
        },
        save: (images, labels) => {
            dispatch(saveLabels(images, labels));
            dispatch(setDoneStatus());
        }
    }
}

const SaveIndicator = connect(
    mapStateToProps,
    mapDispatchToProps
)(SaveIndicatorP);

export default SaveIndicator;