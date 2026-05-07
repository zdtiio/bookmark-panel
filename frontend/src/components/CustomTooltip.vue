<template>
  <div class="tooltip-wrapper">
    <span 
      class="tooltip-trigger"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @mousemove="handleMouseMove"
    >
      <slot></slot>
    </span>
    <Transition name="tooltip">
      <div 
        v-if="showTooltip && text" 
        class="tooltip-content"
        :style="tooltipStyle"
      >
        {{ text }}
        <div class="tooltip-arrow"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  placement: {
    type: String,
    default: 'top',
    validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
  }
});

const showTooltip = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);

const handleMouseMove = (event) => {
  mouseX.value = event.clientX;
  mouseY.value = event.clientY;
};

const tooltipStyle = computed(() => {
  const offset = 12;
  let style = {};
  
  switch (props.placement) {
    case 'top':
      style = {
        left: `${mouseX.value}px`,
        top: `${mouseY.value - offset}px`,
        transform: 'translate(-50%, -100%)'
      };
      break;
    case 'bottom':
      style = {
        left: `${mouseX.value}px`,
        top: `${mouseY.value + offset}px`,
        transform: 'translate(-50%, 0)'
      };
      break;
    case 'left':
      style = {
        left: `${mouseX.value - offset}px`,
        top: `${mouseY.value}px`,
        transform: 'translate(-100%, -50%)'
      };
      break;
    case 'right':
      style = {
        left: `${mouseX.value + offset}px`,
        top: `${mouseY.value}px`,
        transform: 'translate(0, -50%)'
      };
      break;
  }
  
  return style;
});
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline;
}

.tooltip-trigger {
  display: inline;
}

.tooltip-content {
  position: fixed;
  max-width: 320px;
  padding: 10px 14px;
  background: rgba(30, 30, 50, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 13px;
  color: #fff;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  pointer-events: none;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(30, 30, 50, 0.95);
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content[data-placement="bottom"] .tooltip-arrow {
  border-top: none;
  border-bottom: 8px solid rgba(30, 30, 50, 0.95);
  top: -8px;
  bottom: auto;
}

.tooltip-content[data-placement="left"] .tooltip-arrow {
  border-left: none;
  border-right: 8px solid rgba(30, 30, 50, 0.95);
  left: auto;
  right: -8px;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
}

.tooltip-content[data-placement="right"] .tooltip-arrow {
  border-right: none;
  border-left: 8px solid rgba(30, 30, 50, 0.95);
  left: -8px;
  right: auto;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 8px)) scale(0.95);
}

.tooltip-enter-to,
.tooltip-leave-from {
  opacity: 1;
  transform: translate(-50%, -100%) scale(1);
}
</style>