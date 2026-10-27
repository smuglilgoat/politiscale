<script>
  let { text, variant = "", title = null } = $props();
</script>

<span class="badge {variant}" title={title}>{text}</span>
