import * as React from "react";
import "./style.css";

export default class ThumbnailP extends React.Component {
    constructor(props) {
        super(props);

    }

    getThumbnailPath() {
        return this.props.resPath + "_files/8/0_0.jpeg";
    }

    render() {
        let thumbnailPath = this.getThumbnailPath();
        return (
            <div className={"tn-card"}>
                <div className="l-img-thumbnail">
                    <img src={thumbnailPath}/>
                </div>
                <div className={"tn-text"}>
                    <div className={"tn-title"}>
                        {this.props.title}
                    </div>
                    <div className={"tn-subtitle"}>
                        4 labels
                    </div>
                </div>

            </div>
        );
    }

}