---
title: "CUDA's memory model: why memory, not compute, is the bottleneck"
date: 2026-03-29
summary: "Registers, shared memory, global memory, constant memory, texture memory — where each one sits on-chip or off-chip, and why most CUDA performance issues trace back to global memory."
linkedin: https://www.linkedin.com/posts/vitothedev_cuda-memory-model-when-i-started-learning-activity-7444006890608521216-ogyT
---

When I started learning CUDA, I thought performance was about parallelism. I was wrong — memory is the real bottleneck.

## Memory hierarchy defines performance

Register → shared memory → global memory. Optimizing is more about minimizing slow memory access and maximizing data reuse than it is about parallelism itself.

## Registers: fastest but limited

Private to each thread, on-chip, allocated per thread.

## Shared memory: the optimization playground

Shared within a block, on-chip. Data reuse and tiling are critical for matrix operations — shared memory is where most performance gains come from.

## Global memory: large but costly

Accessible by all threads in a grid, off-chip. Most CUDA performance issues originate here.

## Constant memory

Read-only, cached. Efficient when all threads read the same value.

## Texture memory

Cached, optimized for spatial locality. Useful for irregular access patterns.

## Key insight

CUDA performance is not compute-bound — it's memory-bound. Optimization is more about controlling how data moves than about how much you parallelize.

![The CUDA memory hierarchy: registers, shared memory, and global memory](../../assets/cuda_memory_model.jpeg)