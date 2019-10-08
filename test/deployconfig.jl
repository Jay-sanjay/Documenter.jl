@testset "Travis CI deploy configuration" begin
    # Regular tag build
    withenv("TRAVIS_CI" => "true",
            "TRAVIS_PULL_REQUEST" => "false",
            "TRAVIS_REPO_SLUG" => "JuliaDocs/Documenter.jl",
            "TRAVIS_BRANCH" => "master",
            "TRAVIS_TAG" => "v1.2.3",
            "DOCUMENTER_KEY" => "SGVsbG8sIHdvcmxkLg==",
        ) do
        cfg = Documenter.Travis()
        @test Documenter.should_deploy(cfg; repo="github.com/JuliaDocs/Documenter.jl.git", devbranch="master")
        @test Documenter.git_tag(cfg) === "v1.2.3"
        @test Documenter.documenter_key(cfg) === "SGVsbG8sIHdvcmxkLg=="
    end
    # Regular devbranch build
    withenv("TRAVIS_CI" => "true",
            "TRAVIS_PULL_REQUEST" => "false",
            "TRAVIS_REPO_SLUG" => "JuliaDocs/Documenter.jl",
            "TRAVIS_BRANCH" => "master",
            "TRAVIS_TAG" => nothing,
            "DOCUMENTER_KEY" => "SGVsbG8sIHdvcmxkLg==",
        ) do
        cfg = Documenter.Travis()
        @test Documenter.should_deploy(cfg; repo="github.com/JuliaDocs/Documenter.jl.git", devbranch="master")
        @test Documenter.git_tag(cfg) === nothing
        @test Documenter.documenter_key(cfg) === "SGVsbG8sIHdvcmxkLg=="
    end
    # Missing environment variables
    withenv("TRAVIS_CI" => "true",
            "TRAVIS_PULL_REQUEST" => "false",
            "TRAVIS_REPO_SLUG" => "JuliaDocs/Documenter.jl",
            "TRAVIS_BRANCH" => "master",
            "TRAVIS_TAG" => "v1.2.3",
            "DOCUMENTER_KEY" => nothing,
        ) do
        cfg = Documenter.Travis()
        @test !Documenter.should_deploy(cfg; repo="github.com/JuliaDocs/Documenter.jl.git", devbranch="master")
    end
end