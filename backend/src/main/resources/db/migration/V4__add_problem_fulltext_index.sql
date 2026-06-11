ALTER TABLE problems
    ADD FULLTEXT INDEX ft_problems_title_description (title, description);
