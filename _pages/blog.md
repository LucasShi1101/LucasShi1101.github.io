---
layout: page
title: blog
permalink: /blog/
description: Notes on AI interpretability, foundation models, and research.
nav: true
nav_order: 3
---

{% if site.posts.size > 0 %}
  <ul class="post-list">
    {% for post in site.posts %}
      <li>
        <p class="post-meta">{{ post.date | date: '%B %d, %Y' }}</p>
        <h2>
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        {% if post.description %}
          <p>{{ post.description }}</p>
        {% else %}
          <p>{{ post.excerpt | strip_html | truncatewords: 40 }}</p>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
{% else %}
  <p>No posts yet. Check back soon.</p>
{% endif %}
