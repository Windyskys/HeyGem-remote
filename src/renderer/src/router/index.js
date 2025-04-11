import { createRouter, createWebHashHistory } from 'vue-router'
import home from '@renderer/views/home/index.vue'
import account from '@renderer/views/account/index.vue'
import VideoEditView from '@renderer/views/video-edit/VideoEditView.vue'
import mediaTool from '@renderer/views/media-tool/index.vue'
import settings from '@renderer/views/settings/index.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      redirect: '/home'
    },
    {
      path: '/home',
      name: 'home',
      component: home
    },
    {
      path: '/video/edit',
      name: 'videoEdit',
      component: VideoEditView
    },
    {
      path: '/account',
      name: 'account',
      component: account
    },
    {
      path: '/media-tool',
      name: 'mediaTool',
      component: mediaTool
    },
    {
      path: '/settings',
      name: 'settings',
      component: settings
    }
  ]
})

export default router
