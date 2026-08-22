---
title: "First CUDA program: vector addition"
date: 2026-03-22
summary: "The host/device split and the six-step memory dance every CUDA program follows — allocate, copy to GPU, execute, copy back, free — starting from the simplest possible kernel."
linkedin: https://www.linkedin.com/posts/vitothedev_cuda-parallelcomputing-hpc-activity-7441457904911630336-XxnD
---

Today I implemented a CUDA program — vector addition on GPU.

## Host vs. device

Host = CPU. Device = GPU.

## Memory flow matters

Unlike typical CPU programs, CUDA requires explicit memory management:

1. Allocate memory on CPU
2. Allocate memory on GPU
3. Copy data to GPU
4. Execute kernel
5. Copy results back
6. Free memory

## Memory is everything in CUDA

Performance in CUDA is heavily tied to memory allocation, CPU ↔ GPU transfer, and memory access patterns.

Source code: [cuda_add.cu](https://github.com/vito-lin-dev/cuda_practice/blob/82f8a9a7098007508bf54f7bc47c8d1e2aaa730d/cuda_add.cu)

![Vector addition running on the GPU](../../assets/cuda_vector_addition.jpeg)