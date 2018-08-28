import * as React from "react";
import "../styles/Collection.css";
import connect from "react-redux/es/connect/connect";
import "@material/elevation/dist/mdc.elevation.css";
import {fetchThumbnails, selectCollection} from "./browserActions";
import {WidthProvider} from "react-grid-layout";
import RGL from "react-grid-layout";
import {withRouter} from "react-router";

const ReactGridLayout = WidthProvider(RGL);

class CollectionP extends React.Component {
    constructor(props) {
        super(props);
        this.handleHover = this.handleHover.bind(this);
        this.state = {
            isHovered: false
        };
        this.props.getThumbnails(4);
    }

    getThumbnails(n) {
        let ret = [];
        let w = 6;
        let h = 1;

        for (let i = 0; i < n; i++) {
            let path = "";
            if (this.props.thumbnails.length > i) {
                path = "api/v1/image/" + this.props.thumbnails[i].id + "_files/8/0_0.jpeg";
            }
            ret.push(
                <div className="thumbnail-container" key={i} data-grid={{x:w*(i%2), y:h * Math.floor(i/2), w: w, h: h}}>
                    <img className="preview" src={path}/>
                </div>);
        }
        return ret;
    }

    handleHover() {
        this.setState({
                          isHovered: !this.state.isHovered
                      });
    }

    render() {
        let hoverClass = this.state.isHovered ? "mdc-elevation--z2" : "mdc-elevation--z1";
        let widthClass = this.props.fixedWidth ? "fixed-width" : "";

        return (
            <li className={"tn-card " + hoverClass + " " + widthClass + " mdc-elevation-transition "}
                onClick={this.props.onSelect}
                onMouseEnter={this.handleHover}
                onMouseLeave={this.handleHover}>
                <ReactGridLayout className="layout" autoSize={true} isDraggable={false} isResizable={false}
                                 rowHeight={50} responsive={false}>
                    {this.getThumbnails(4)}
                </ReactGridLayout>
                <div className={"co-text"}>
                    <div className={"co-title"}>
                        {this.props.title}
                    </div>
                    <div className={"co-subtitle"}>
                        4 labels
                    </div>
                </div>
            </li>
        );
    }

}

// ---------- Container ----------

function mapStateToProps(state, ownProps) {
    let id = state.folders.findIndex(x => x.objId === ownProps.objId);
    return {
        thumbnails: state.folders[id].thumbnails || []
    }
}

function mapDispatchToProps(dispatch, ownProps) {
    return {
        onSelect: (event) => {
            dispatch(selectCollection(ownProps.objId, ownProps.history));
        },
        getThumbnails: (count) => {
            dispatch(fetchThumbnails(ownProps.objId, count));
        }
    }
}

const Collection = withRouter(connect(
    mapStateToProps,
    mapDispatchToProps
)(CollectionP));

export default Collection;