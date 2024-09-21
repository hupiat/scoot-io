package hupiat.scootio.server.markers;

import java.util.List;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hupiat.scootio.server.core.controllers.ICommonController;

@RequestMapping(ICommonController.API_PREFIX + "/markers")
@RestController
public class MarkerController implements ICommonController<MarkerEntity> {

	private final MarkerRepository repository;
	
	public MarkerController(MarkerRepository repository) {
		super();
		this.repository = repository;
	}

	@Override
	public List<MarkerEntity> getAll() {
		return repository.findAll();
	}

	@Override
	public MarkerEntity getById(@PathVariable long id) {
		return repository.findById(id).orElseThrow();
	}

	@Override
	public MarkerEntity add(@RequestBody MarkerEntity entity) {
		return repository.save(entity);
	}

	@Override
	public MarkerEntity update(@RequestBody MarkerEntity entity) {
		return repository.save(entity);
	}

	@Override
	public void delete(@PathVariable long id) {
		repository.deleteById(id);
	}

}
