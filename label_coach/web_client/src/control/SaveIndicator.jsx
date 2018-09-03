import * as React from "react";
import {editSaveIndicatorText, saveLabels, setSaveStatus} from "./controlActions";
import {connect} from "react-redux";
import TimeAgo from "javascript-time-ago";
// Load locale-specific relative date/time formatting rules.
import en from 'javascript-time-ago/locale/en'
class SaveIndicatorP extends React.Component{
    constructor(props) {
        super(props);
        TimeAgo.locale(en);
        this.timeAgo = new TimeAgo('en-US');
    }

    render() {
        if(this.props.status === "dirty") {
            this.props.editText("Saving...");
            this.props.setStatus("done");
            this.props.save(this.props.state);

        }
        return (
            <div data-toggle="tooltip" title={this.timeAgo.format(this.props.lastUpdated)}>{this.props.text}</div>
        );
    }

}

// ---------- Container ----------

function formatSaveText(text, lastUpdated) {

}

function mapStateToProps(state){
    return {
        status: state.saveIndicator.status,
        text: state.saveIndicator.text,
        state: state,
        lastUpdated: state.saveIndicator.lastUpdated || Date.now()
    };
}

function mapDispatchToProps(dispatch){
    return {
        editText: (text)=>{dispatch(editSaveIndicatorText(text))},
        save: (state)=>{dispatch(saveLabels(state))},
        setStatus: (status)=>{dispatch(setSaveStatus(status))}
    }
}

const SaveIndicator = connect(
    mapStateToProps,
    mapDispatchToProps
)(SaveIndicatorP);

export default SaveIndicator;