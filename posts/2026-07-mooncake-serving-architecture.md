---
title: "What I learned from Mooncake — the serving architecture behind Kimi (Moonshot AI)"
date: 2026-07-25
summary: "Notes on Mooncake's FAST '25 paper: disaggregated prefill/decode, a cluster-wide KVCache pool, and prefix hashing that skips prefill on a cache hit."
linkedin: https://www.linkedin.com/posts/vitothedev_%F0%9D%90%96%F0%9D%90%A1%F0%9D%90%9A%F0%9D%90%AD-%F0%9D%90%88-%F0%9D%90%A5%F0%9D%90%9E%F0%9D%90%9A%F0%9D%90%AB%F0%9D%90%A7%F0%9D%90%9E%F0%9D%90%9D-%F0%9D%90%9F%F0%9D%90%AB%F0%9D%90%A8%F0%9D%90%A6-%F0%9D%90%8C%F0%9D%90%A8%F0%9D%90%A8%F0%9D%90%A7%F0%9D%90%9C%F0%9D%90%9A%F0%9D%90%A4%F0%9D%90%9E-share-7486628452058726400-5j2z
---

I recently studied Mooncake's FAST '25 paper, **"Trading More Storage for Less Computation."** The whole idea is *"trade cheap storage for expensive computation"*.

## The problem

The KVCache stored in GPU HBM is so huge and expensive. Many systems keep KVCache local in each GPU, which makes it hard to reuse across requests.

## Mooncake's solution

Mooncake's solution has three parts:

1. **Disaggregate prefill and decode.** The two stages in inference have opposite resource requirements — prefill is compute-bound, decode is memory-bound.
2. **Build a global KVCache pool** across the cluster's machines' CPU DRAM and SSD, connected by high-bandwidth RDMA NICs (which don't need the OS to move the data).
3. **Prefix-hash every KV block** by its token prefix. Once there's a cache hit, prefill is skipped entirely.

## The results

Evaluated on two SLOs — TTFT for prefill latency, TBT for decode smoothness — Mooncake shows up to **2.36×** higher cache hit rate and **48%** less prefill compute versus local caching, and **59%–498%** higher effective request capacity versus vLLM (including vLLM's own prefix-caching and chunked-prefill). In production, Mooncake lets Kimi handle **~75%** more requests under the same SLOs. They also chart how the P/D ratio influences SLOs — performance is best in the **7P9D** to **10P6D** range.

## What's next

The paper really inspired me, and it makes me want to dig into the Mooncake codebase. I might start reading the repo right now.