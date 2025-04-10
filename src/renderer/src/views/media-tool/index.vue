<template>
  <div class="media-tool-content-box">
    <h1>{{ $t('mediaTools.title') }}</h1>
    <p>{{ $t('mediaTools.description') }}</p>
  </div>
</template>

<script setup>
// 组件逻辑将在这里实现
</script>

<style lang="less" scoped>
.media-tool-content-box {
  height: calc(100vh - 60px);
  padding: 20px;
  background-color: #f4f4f6;
  overflow: auto;
}
</style>
