import os
import pytest
from backend.evaluation.dataset import get_initial_dataset, load_evaluation_dataset, get_fallback_dataset
from backend.evaluation.report import create_aggregated_report

def test_initial_dataset():
    dataset = get_initial_dataset()
    assert len(dataset) >= 10
    
    # Check that cases have required fields
    for case in dataset:
        assert isinstance(case.question, str)
        assert isinstance(case.expected_answer, str)
        assert isinstance(case.relevant_source, str)
        assert isinstance(case.acceptable_answer_keywords, list)

def test_benchmark_dataset_loads():
    dataset = load_evaluation_dataset("data/evaluation_dataset.json")
    assert isinstance(dataset, list)
    assert len(dataset) >= 30

def test_every_question_has_required_fields():
    dataset = load_evaluation_dataset("data/evaluation_dataset.json")
    for case in dataset:
        assert getattr(case, "id", "") != ""
        assert isinstance(case.question, str) and len(case.question) > 0
        assert isinstance(case.category, str) and len(case.category) > 0
        assert isinstance(case.expected_sources, list)
        assert isinstance(case.expected_chunks, list)
        assert isinstance(case.expected_answer, str)
        assert isinstance(case.relevant_terms, list)
        assert isinstance(case.expected_answerable, bool)

def test_expected_sources_exist():
    dataset = load_evaluation_dataset("data/evaluation_dataset.json")
    data_dir = "./data"
    for case in dataset:
        if case.expected_answerable:
            assert len(case.expected_sources) > 0
            for src in case.expected_sources:
                fpath = os.path.join(data_dir, src)
                assert os.path.exists(fpath), f"Expected source document {src} does not exist in {data_dir}"

def test_expected_answer_non_empty_for_answerable():
    dataset = load_evaluation_dataset("data/evaluation_dataset.json")
    for case in dataset:
        if case.expected_answerable:
            assert case.expected_answer.strip() != ""

def test_out_of_domain_questions_marked():
    dataset = load_evaluation_dataset("data/evaluation_dataset.json")
    ood_cases = [c for c in dataset if not c.expected_answerable]
    assert len(ood_cases) > 0
    for case in ood_cases:
        assert case.expected_sources == []
        assert case.expected_answer == "I cannot determine the answer from the provided context."

def test_empty_dataset_error(tmp_path):
    # Empty dataset in create_aggregated_report should return 0-summary instead of division-by-zero crash
    report = create_aggregated_report([])
    assert report.total_questions == 0
    assert report.average_precision_at_1 == 0.0
    assert report.average_recall_at_5 == 0.0
    
    # Empty dataset file should raise ValueError
    empty_file = tmp_path / "empty_dataset.json"
    empty_file.write_text("[]", encoding="utf-8")
    with pytest.raises(ValueError):
        load_evaluation_dataset(str(empty_file))


