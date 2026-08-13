---
title: "What GPU hardware really taught me"
date: 2026-04-13
summary: "SMs, warps, and SIMT execution — why GPU performance is about latency hiding and occupancy rather than raw thread count, and why memory, not compute, is usually the real bottleneck."
linkedin: https://www.linkedin.com/posts/vitothedev_cuda-memory-model-when-i-started-learning-activity-7444006890608521216-ogyT
---

When I started learning CUDA, I thought performance was about parallelism.

I was wrong, because memory is the real bottleneck.

🧠 Here is what I learned:

1. Memory hierarchy defines performance
→ Register , Shared Memory , Global Memory 
→ Optimizing is more about  minimizing slow memory access, maximizing data reuse.

2. Registers: fastest but limited
→ Private to each thread
→ On-chip
→ Allocated per thread

3. Shared Memory: the optimization playground
→ Shared within a block
→ On-chip
→ Data reuse and tiling is critical for matrix operation
→ Shared is where most performance gains come from !

4. Global Memory: large but costly
→ Accessible by all threads per grid.
→ Off-chip
→ Most CUDA performance issues originate here !

5. Constant Memory
→ Read-only
→ Cached
→ Efficient when all threads read the same value

6. Texture Memory
→ cached
→ Optimized for spatial locality
→ Useful for irregular access patterns 

💡 Key insight:
CUDA performance is not compute-bound, but memory-bound.
Optimization is more about controlling how data moves.


![Cuda memory model](../../assets/cuda_memory_model.jpeg)