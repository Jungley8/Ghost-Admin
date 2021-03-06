import $ from 'jquery';
import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    clock: service(),

    classNames: 'gh-publishmenu',
    post: null,
    saveTask: null,

    _publishedAtBlogTZ: null,

    isClosing: null,

    forcePublishedMenu: reads('post.pastScheduledTime'),

    postState: computed('post.{isPublished,isScheduled}', 'forcePublishedMenu', function () {
        if (this.get('forcePublishedMenu') || this.get('post.isPublished')) {
            return 'published';
        } else if (this.get('post.isScheduled')) {
            return 'scheduled';
        } else {
            return 'draft';
        }
    }),

    triggerText: computed('postState', function () {
        let state = this.get('postState');

        if (state === 'published') {
            return '更新';
        } else if (state === 'scheduled') {
            return '定时发布';
        } else {
            return '发布';
        }
    }),

    _runningText:  computed('postState', 'saveType', function() {
        let saveType = this.get('saveType');
        let postState = this.get('postState');
        let runningText;

        if (postState === 'draft') {
            runningText = saveType === 'publish' ? 'Publishing' : 'Scheduling';
        }

        if (postState === 'published') {
            runningText = saveType === 'publish' ? 'Updating' : 'Unpublishing';
        }

        if (postState === 'scheduled') {
            runningText = saveType === 'schedule' ? 'Rescheduling' : 'Unscheduling';
        }

        return runningText || '正在发布';
    }),

    runningText: null,

    buttonText:  computed('postState', 'saveType', function() {
        let saveType = this.get('saveType');
        let postState = this.get('postState');
        let buttonText;

        if (postState === 'draft') {
            buttonText = saveType === 'publish' ? '发布' : '定时发布';
        }

        if (postState === 'published') {
            buttonText = saveType === 'publish' ? '更新' : '取消发布';
        }

        if (postState === 'scheduled') {
            buttonText = saveType === 'schedule' ? '重新定时' : '取消定时';
        }

        return buttonText || '发布';
    }),

    successText: computed('_previousStatus', 'postState', function() {
        let postState = this.get('postState');
        let previousStatus = this.get('_previousStatus');
        let buttonText;

        if (previousStatus === 'draft') {
            buttonText = postState === 'published' ? '已发布' : '已定时';
        }

        if (previousStatus === 'published') {
            buttonText = postState === 'draft' ? '取消发布' : '已更新';
        }

        if (previousStatus === 'scheduled') {
            buttonText = postState === 'draft' ? '取消定时' : '已重新定时';
        }

        return buttonText;
    }),

    save: task(function* () {
        // runningText needs to be declared before the other states change during the
        // save action.
        this.set('runningText', this.get('_runningText'));
        this.set('_previousStatus', this.get('post.status'));
        this.get('setSaveType')(this.get('saveType'));

        try {
            // validate publishedAtBlog first to avoid an alert for displayed errors
            yield this.get('post').validate({property: 'publishedAtBlog'});

            // actual save will show alert for other failed validations
            let post = yield this.get('saveTask').perform();

            this._cachePublishedAtBlogTZ();
            return post;

        } catch (error) {
            // re-throw if we don't have a validation error
            if (error) {
                throw error;
            }
        }
    }),

    _previousStatus: null,

    _cachePublishedAtBlogTZ() {
        this._publishedAtBlogTZ = this.get('post.publishedAtBlogTZ');
    },

    // when closing the menu we reset the publishedAtBlogTZ date so that the
    // unsaved changes made to the scheduled date aren't reflected in the PSM
    _resetPublishedAtBlogTZ() {
        this.get('post').set('publishedAtBlogTZ', this._publishedAtBlogTZ);
    },

    actions: {
        setSaveType(saveType) {
            let post = this.get('post');

            this.set('saveType', saveType);

            if (saveType === 'draft') {
                post.set('statusScratch', 'draft');
            } else if (saveType === 'schedule') {
                post.set('statusScratch', 'scheduled');
            } else if (saveType === 'publish') {
                post.set('statusScratch', 'published');
            }
        },

        open() {
            this._cachePublishedAtBlogTZ();
            this.set('isClosing', false);
            this.get('post.errors').clear();
            if (this.get('onOpen')) {
                this.get('onOpen')();
            }
        },

        close(dropdown, e) {
            let post = this.get('post');

            // don't close the menu if the datepicker popup is clicked
            if (e && $(e.target).closest('.ember-power-datepicker-content').length) {
                return false;
            }

            // cleanup
            this._resetPublishedAtBlogTZ();
            post.set('statusScratch', null);
            post.validate();

            if (this.get('onClose')) {
                this.get('onClose')();
            }

            this.set('isClosing', true);

            return true;
        }
    }
});
