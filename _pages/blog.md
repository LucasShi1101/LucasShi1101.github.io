---
layout: page
title: blog
permalink: /blog/
description: Research stories from inside foundation models.
nav: true
nav_order: 3
hide_title: true
---

<div class="blog-index">
  <div class="blog-index__intro"><p class="home-section__index">Research journal</p><h1>Ideas, methods, and findings.</h1><p>Readable accounts of work on model interpretability, safety, multimodal learning, and the knowledge inside AI.</p></div>

  {% if site.posts.size > 0 %}
    {% assign sorted_posts = site.posts | sort: 'date' | reverse %}
    <div class="blog-index__list">
      {% for post in sorted_posts %}
        <a class="blog-index__card theme-{{ post.design_theme }}" href="{{ post.url | relative_url }}">
          <div class="blog-index__card-image">{% if post.hero_image %}<img src="{{ post.hero_image | relative_url }}" alt="" loading="lazy">{% endif %}</div>
          <div class="blog-index__card-copy"><span class="blog-index__card-meta">{{ post.date | date: '%B %d, %Y' }} <span aria-hidden="true">·</span> {{ post.paper_short }}</span><h3>{{ post.title }}</h3><p>{{ post.description }}</p><span class="blog-index__card-link">Read article <span aria-hidden="true">↗</span></span></div>
        </a>
      {% endfor %}
    </div>
  {% else %}<p>No posts yet. Check back soon.</p>{% endif %}
</div>
