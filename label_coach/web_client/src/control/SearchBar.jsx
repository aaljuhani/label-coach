import * as React from "react";
import "../styles/SearchBar.css";
import {connect} from "react-redux";
import {addSearchEntry} from "./controlActions";


class SearchBarP extends React.Component{
    constructor(props) {
        super(props);

    }

    render() {
        return (
        <div className="container search-box">
            <input className="form-control" type="text" placeholder="Search..." onChange={this.props.onSearch}/>
        </div>
        );
    }

}

// ---------- Container ----------

function mapStateToProps(state){
    return state;
}

function mapDispatchToProps(dispatch, ownProps) {
    return {
        onSearch: (event) => dispatch(addSearchEntry(event.target.value, ownProps.id)),
    }
}

const SearchBar = connect(
    mapStateToProps,
    mapDispatchToProps
)(SearchBarP);

export default SearchBar;