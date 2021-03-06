import React from 'react';
import UserPost from './userpost/UserPost';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { userPostRequest } from '../../actions/userPostActions';
import { requestInitialPosts, requestRecentPosts, setInitialPosts, injectPostsToNewsfeed, revealCollectedPosts } from '../../actions/timelineActions';
import { fetchNotificationsHistory, setNotificationState } from '../../actions/notificationActions';
import CollectedPostsStatus from './CollectedPostsStatus';
import io from 'socket.io-client';
import { setSocketToEstablished } from '../../actions/socketActions';
import NewsfeedTimeline from './NewsfeedTimeline';

const socket = io('http://localhost:3000');

// Newsfeed component
class NewsfeedComponents extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputText: '',
      charCount: 0,
      alert: '',
      isLoading: false,
      textInputEmpty: true,
      latestPost: 'false',
      errors: {},
      userPosting: false,
      postActive: false,
      currentNewPostsLength: 0,
    };
    this.onTyping = this.onTyping.bind(this);
    this.onPost = this.onPost.bind(this);
    this.requestRecentPosts = this.requestRecentPosts.bind(this);
    this.textInputFocus = this.textInputFocus.bind(this);
    this.textInputBlur = this.textInputBlur.bind(this);
    this.revealCollectedPosts = this.revealCollectedPosts.bind(this);
    this.sendNotification = this.sendNotification.bind(this);
  }

  componentDidMount() {
    // Initial posts request
    this.props.requestInitialPosts().then(
      (res) => {
        this.props.setInitialPosts(res.data.initialPosts);
        this.setState({ latestPost: res.data.initialPosts[0].postDate });
        // Set interval for perpetual recent posts request to 5 seconds
        const intervalId = setInterval(this.requestRecentPosts, 5000);
        this.setState({ intervalId });
      },
      (err) => { this.setState({ errors: err.response.data }); },
    );

    this.props.fetchNotificationsHistory().then(
      (res) => {
        this.props.setNotificationState(res.data);
      },
      (err) => { console.log('error'); },
    );
  }

  componentWillMount() {
    socket.on('receive-notification', () => {
      this.props.updateUnreadNotificationsState();
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  textInputFocus() {
    this.setState({ postActive: true });
  }

  textInputBlur(e) {
    if (this.state.inputText === '') {
      this.setState({ postActive: false });
    }
  }

  // Request recent posts async
  requestRecentPosts(isUserPost) {
    this.props.requestRecentPosts(this.state).then(
      (res) => {
        if (res.data.recentPosts[0]) {
          this.setState({ latestPost: res.data.recentPosts[0].postDate });
          this.props.injectPostsToNewsfeed(res.data);
          this.setState({ currentNewPostsLength: res.data.recentPosts.length });
        }
      },
    )
      .then(() => {
        if (isUserPost) {
          this.revealCollectedPosts();
          const intervalId = setInterval(this.requestRecentPosts, 5000);
          this.setState({ intervalId, userPosting: false, isLoading: false, inputText: '', charCount: 0 });
        }
      }).catch(() => console.log('error'));
  }

  onTyping(e) {
    const text = e.target.value;
    const charCount = text.length;
    if (charCount <= 140) {
      this.setState({ [e.target.name]: text, charCount, alert: '' });
    } else {
      this.setState({ alert: 'Maximum character reached!' });
    }

    if (charCount > 0) {
      this.setState({ textInputEmpty: false });
    } else {
      this.setState({ textInputEmpty: true });
    }
  }

  onPost(e) {
    e.preventDefault();
    this.setState({ isLoading: true });
    if (this.state.inputText === '') {
      this.setState({ alert: 'Oops, you didn\'t type anything yet', isLoading: false });
    } else {
      this.setState({ userPosting: true });
      this.props.userPostRequest(this.state)
        .then((res) => {
          const text = res.data.post.text;
          this.requestRecentPosts({ isUser: true });
          clearInterval(this.state.intervalId);
          this.sendNotification({ userMentioned: res.data.mention, triggeredBy: this.props.auth.user.id });
        })
        .catch((err) => { this.setState({ errors: err.response.data, inputText: '', charCount: 0, isLoading: false, userPosting: false }); });
    }
  }

  sendNotification(notificationData) {
    socket.emit('send-notification', notificationData);
  }

  revealCollectedPosts() {
    this.props.revealCollectedPosts();
  }

  // Conditional rendering
  render() {
    const { isFetchingPosts } = this.props.initialPosts;
    if (this.props.initialPosts) {
      const { userPostRequest } = this.props;
      const { initialPosts } = this.props.initialPosts;
      const { textInputEmpty } = this.state;
      const loading = require('./loading.gif');
      return (
        <div className='container'>
          <div className='col-md-5 col-md-offset-3'>
            <UserPost
              userPostRequest={ userPostRequest }
              onTyping={ this.onTyping }
              onPost={ this.onPost }
              textInputEmpty = { textInputEmpty }
              inputText={ this.state.inputText }
              charCount={ this.state.charCount }
              alert={ this.state.alert }
              isLoading={ this.state.isLoading }
              textInputFocus={ this.textInputFocus }
              textInputBlur={ this.textInputBlur }
              postActive={ this.state.postActive }
            />
            <CollectedPostsStatus revealCollectedPosts={ this.revealCollectedPosts }/>
            {isFetchingPosts ? <div className='center-block'><img src={ loading }/></div> : <NewsfeedTimeline initialPosts={ initialPosts } sendNotification={ this.props.sendNotification }/> }
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

NewsfeedComponents.propTypes = {
  userPostRequest: PropTypes.func.isRequired,
  requestInitialPosts: PropTypes.func.isRequired,
  requestRecentPosts: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
  return {
    auth: state.auth,
    socketEstablished: state.socket.socketEstablished,
    initialPosts: state.newsfeed,
  };
}

export default connect(mapStateToProps, { setSocketToEstablished, userPostRequest, requestInitialPosts, requestRecentPosts, setInitialPosts, injectPostsToNewsfeed, fetchNotificationsHistory, setNotificationState, revealCollectedPosts })(NewsfeedComponents);
